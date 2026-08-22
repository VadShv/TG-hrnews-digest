"""kurigram (Pyrogram fork) client manager — handles login flow and messaging."""

import os
import logging
from pyrogram import Client
from pyrogram.session import StringSession
from db import db
from crypto import encrypt, decrypt

log = logging.getLogger("tg")

API_ID = int(os.environ.get("TG_API_ID", "0"))
API_HASH = os.environ.get("TG_API_HASH", "")


class TgManager:
    def __init__(self):
        self.client: Client | None = None
        self.phone: str | None = None
        self._phone_code_hash: str | None = None

    @property
    def is_connected(self) -> bool:
        return self.client is not None and self.client.is_connected

    async def load_from_db(self):
        """On startup, restore an active session from the DB."""
        row = await db.fetchrow(
            'SELECT "sessionEncrypted", "phone", "status" FROM "TgSession" LIMIT 1'
        )
        if not row or not row["sessionencrypted"] or row["status"] != "active":
            return
        try:
            session_str = decrypt(row["sessionencrypted"])
            self.client = Client(
                "hrpulse",
                api_id=API_ID,
                api_hash=API_HASH,
                session=StringSession(session_str),
                no_updates=True,
            )
            await self.client.start()
            self.phone = row["phone"]
            log.info("TG session restored for %s", self.phone)
        except Exception as e:
            log.error("Failed to restore TG session: %s", e)

    async def login_start(self, phone: str):
        """Send a login code to the phone number."""
        if not API_ID or not API_HASH:
            raise RuntimeError("TG_API_ID и TG_API_HASH должны быть заданы")
        self.client = Client(
            "hrpulse", api_id=API_ID, api_hash=API_HASH, in_memory=True, no_updates=True
        )
        await self.client.connect()
        sent = await self.client.send_code(phone)
        self.phone = phone
        self._phone_code_hash = sent.phone_code_hash
        return {"ok": True, "phone": phone}

    async def login_submit(self, phone: str, code: str, password: str | None = None):
        """Complete login with the code (+ 2FA password if needed)."""
        if not self.client:
            raise RuntimeError("Сначала вызовите login_start")
        try:
            await self.client.sign_in(phone, code, phone_code_hash=self._phone_code_hash)
        except Exception as e:
            if "SESSION_PASSWORD_NEEDED" in str(e).upper():
                if not password:
                    raise RuntimeError("Требуется пароль 2FA")
                await self.client.check_password(password)
            else:
                raise

        session_str = await self.client.export_session_string()
        encrypted = encrypt(session_str)

        # Save to DB (upsert the single TgSession row)
        existing = await db.fetchrow('SELECT "id" FROM "TgSession" LIMIT 1')
        if existing:
            await db.execute(
                'UPDATE "TgSession" SET "sessionEncrypted"=$1, "phone"=$2, "status"=$3 WHERE "id"=$4',
                encrypted, phone, "active", existing["id"],
            )
        else:
            await db.execute(
                'INSERT INTO "TgSession" ("id", "sessionEncrypted", "phone", "status") VALUES (gen_random_uuid()::text, $1, $2, $3)',
                encrypted, phone, "active",
            )

        self.phone = phone
        return {"ok": True, "phone": phone}

    async def send_message(self, chat_id: str, text: str):
        """Send a text message to a chat/group."""
        if not self.client:
            raise RuntimeError("TG клиент не подключён")
        # Split long messages (Telegram limit ~4096 chars)
        for i in range(0, len(text), 4000):
            await self.client.send_message(chat_id, text[i : i + 4000])
        return {"ok": True}

    async def get_history(self, chat_id: str, limit: int = 50, offset_id: int = 0):
        """Read channel history (for scan_channel jobs)."""
        if not self.client:
            raise RuntimeError("TG клиент не подключён")
        messages = []
        async for msg in self.client.get_chat_history(
            chat_id, limit=limit, offset=offset_id if offset_id else 0
        ):
            if msg.text and len(msg.text) > 20:
                messages.append(
                    {
                        "id": msg.id,
                        "text": msg.text,
                        "date": msg.date.isoformat() if msg.date else None,
                    }
                )
        return messages

    async def logout(self):
        if self.client:
            try:
                await self.client.stop()
            except Exception:
                pass
        self.client = None
        self.phone = None
        existing = await db.fetchrow('SELECT "id" FROM "TgSession" LIMIT 1')
        if existing:
            await db.execute(
                'UPDATE "TgSession" SET "status"=$1, "sessionEncrypted"=NULL WHERE "id"=$2',
                "off", existing["id"],
            )

    async def status(self):
        return {
            "connected": self.is_connected,
            "phone": self.phone,
        }
