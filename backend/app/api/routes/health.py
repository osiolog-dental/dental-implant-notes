from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: Annotated[AsyncSession, Depends(get_db)]) -> dict:
    """
    Liveness probe.
    Returns {"status": "ok", "db": "ok"} on success.
    Returns {"status": "degraded", "db": "error"} (HTTP 200) on DB failure
    so load balancers do not kill the instance on transient DB issues.
    """
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception:
        return {"status": "degraded", "db": "error"}
