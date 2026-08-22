#!/bin/sh
set -e

echo "[entrypoint] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[entrypoint] Starting Next.js server..."
exec node server.js
