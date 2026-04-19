from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.audit import AuditEvent
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditEventRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    action: str
    entity_type: str
    entity_id: str
    metadata: dict | None = None
    ip_address: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[AuditEventRead])
async def list_audit_events(
    entity_type: str | None = Query(None),
    entity_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AuditEventRead]:
    """Return audit events for the current org. Paginated, filterable by entity."""
    stmt = (
        select(AuditEvent)
        .where(AuditEvent.org_id == current_user.org_id)
        .order_by(AuditEvent.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    if entity_type:
        stmt = stmt.where(AuditEvent.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(AuditEvent.entity_id == entity_id)

    result = await db.execute(stmt)
    events = result.scalars().all()
    return [
        AuditEventRead(
            id=e.id,
            user_id=e.user_id,
            action=e.action,
            entity_type=e.entity_type,
            entity_id=e.entity_id,
            metadata=e.event_metadata,
            ip_address=e.ip_address,
            created_at=e.created_at,
        )
        for e in events
    ]
