"""Database access via asyncpg (shared Postgres with the Next.js app)."""

import os
import asyncpg


class Database:
    def __init__(self):
        self.pool: asyncpg.Pool | None = None

    async def init(self):
        url = os.environ["DATABASE_URL"]
        self.pool = await asyncpg.create_pool(url, min_size=1, max_size=5, command_timeout=30)

    async def close(self):
        if self.pool:
            await self.pool.close()

    async def fetchrow(self, query, *args):
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetch(self, query, *args):
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def execute(self, query, *args):
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)


db = Database()
