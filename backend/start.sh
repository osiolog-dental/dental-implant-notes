#!/bin/bash
set -e

echo "[start] Running Alembic migrations..."
alembic upgrade head

echo "[start] Starting uvicorn..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8002 \
  --workers 2 \
  --log-level info
