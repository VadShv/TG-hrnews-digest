"""Background job loop — polls TgJob and executes via kurigram."""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from db import db
from tg_client import TgManager

log = logging.getLogger("jobs")


def _payload(row_val):
    if isinstance(row_val, str):
        return json.loads(row_val)
    return row_val


async def process_job(manager: TgManager, job: dict) -> dict:
    """Execute a single TgJob. Returns a result dict."""
    job_type = job["type"]
    payload = _payload(job["payload"])

    if job_type == "send_test":
        chat_id = payload["chatId"]
        message = payload.get("message", "🧪 Тест")
        await manager.send_message(chat_id, message)
        return {"sent": True}

    if job_type == "post_digest":
        chat_id = payload["chatId"]
        message = payload["message"]
        await manager.send_message(chat_id, message)
        # Update the linked Broadcast record
        await db.execute(
            'UPDATE "Broadcast" SET "status"=$1, "sentAt"=NOW() WHERE "tgJobId"=$2',
            "sent", job["id"],
        )
        return {"sent": True, "chatId": chat_id}

    if job_type == "scan_channel":
        chat_id = payload["chatId"]
        tg_channel_id = payload.get("tgChannelId")
        last_msg_id = payload.get("lastMessageId") or 0
        messages = await manager.get_history(chat_id, limit=100, offset_id=last_msg_id)
        added = 0
        max_msg_id = last_msg_id
        for msg in messages:
            url = f"tg://channel/{chat_id}/{msg['id']}"
            title = msg["text"].split("\n")[0][:200]
            snippet = msg["text"][:500]
            pub_date = msg.get("date")
            try:
                await db.execute(
                    """INSERT INTO "NewsArticle"
                       ("id","title","url","snippet","source","sourceType","language","publishedAt","createdAt","updatedAt")
                       VALUES ($1,$2,$3,$4,$5,'tg','ru',$6,NOW(),NOW())
                       ON CONFLICT ("url") DO NOTHING""",
                    str(uuid.uuid4()), title, url, snippet, f"tg:{chat_id}",
                    datetime.fromisoformat(pub_date) if pub_date else None,
                )
                added += 1
            except Exception as e:
                log.warning("Article upsert failed: %s", e)
            if msg["id"] > max_msg_id:
                max_msg_id = msg["id"]

        # Update TgChannel tracking
        if tg_channel_id:
            await db.execute(
                'UPDATE "TgChannel" SET "lastScannedAt"=NOW(), "lastMessageId"=$1 WHERE "id"=$2',
                max_msg_id, tg_channel_id,
            )
        return {"scanned": len(messages), "added": added, "lastMessageId": max_msg_id}

    raise ValueError(f"Unknown job type: {job_type}")


async def start_job_loop(manager: TgManager):
    """Continuously poll for pending jobs and process them."""
    log.info("Job loop started")
    while True:
        try:
            if not manager.is_connected:
                await asyncio.sleep(5)
                continue

            job = await db.fetchrow(
                'SELECT "id","type","payload" FROM "TgJob" WHERE "status"=$1 ORDER BY "createdAt" ASC LIMIT 1',
                "pending",
            )
            if not job:
                await asyncio.sleep(2)
                continue

            await db.execute(
                'UPDATE "TgJob" SET "status"=$1, "startedAt"=NOW() WHERE "id"=$2',
                "running", job["id"],
            )
            try:
                result = await process_job(manager, job)
                await db.execute(
                    'UPDATE "TgJob" SET "status"=$1, "result"=$2, "finishedAt"=NOW() WHERE "id"=$3',
                    "done", json.dumps(result), job["id"],
                )
                log.info("Job %s done: %s", job["id"][:8], result)
            except Exception as e:
                await db.execute(
                    'UPDATE "TgJob" SET "status"=$1, "error"=$2, "finishedAt"=NOW() WHERE "id"=$3',
                    "failed", str(e)[:500], job["id"],
                )
                # Mark linked broadcast as failed
                await db.execute(
                    'UPDATE "Broadcast" SET "status"=$1, "errorMessage"=$2 WHERE "tgJobId"=$3',
                    "failed", str(e)[:500], job["id"],
                )
                log.error("Job %s failed: %s", job["id"][:8], e)
        except Exception as e:
            log.error("Job loop error: %s", e)
            await asyncio.sleep(5)
