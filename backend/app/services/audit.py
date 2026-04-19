from __future__ import annotations

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditEvent

logger = logging.getLogger("dentalhub.audit")


async def log_event(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    action: str,
    entity_type: str,
    entity_id: str,
    metadata: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """
    Write an audit event row. Never raises — a logging failure must not
    crash the parent request. The caller does not need to await flush.
    """
    try:
        db.add(AuditEvent(
            org_id=org_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            event_metadata=metadata,
            ip_address=ip_address,
        ))
        await db.flush()
    except Exception as exc:
        logger.error("Audit log failed (action=%s entity=%s/%s): %s", action, entity_type, entity_id, exc)
