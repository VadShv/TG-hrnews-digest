"""HR Pulse — Telegram worker (kurigram MTProto + FastAPI + job queue)."""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from pydantic import BaseModel

from db import db
from tg_client import TgManager
from job_worker import start_job_loop

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
log = logging.getLogger("main")

manager = TgManager()
_job_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _job_task
    await db.init()
    await manager.load_from_db()
    _job_task = asyncio.create_task(start_job_loop(manager))
    log.info("TG worker started")
    yield
    if _job_task:
        _job_task.cancel()
    await manager.logout()
    await db.close()


app = FastAPI(title="HR Pulse TG Worker", lifespan=lifespan)


class LoginStart(BaseModel):
    phone: str


class LoginSubmit(BaseModel):
    phone: str
    code: str
    password: str | None = None


@app.post("/tg/login/start")
async def login_start(body: LoginStart):
    try:
        result = await manager.login_start(body.phone)
        return result
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/tg/login/submit")
async def login_submit(body: LoginSubmit):
    try:
        result = await manager.login_submit(body.phone, body.code, body.password)
        return result
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/tg/logout")
async def logout():
    await manager.logout()
    return {"ok": True}


@app.get("/tg/session")
async def session():
    return await manager.status()


@app.get("/health")
async def health():
    return {"status": "ok", "tg_connected": manager.is_connected}
