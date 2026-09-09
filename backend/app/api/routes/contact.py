from __future__ import annotations

import asyncio
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_optional
from app.db.session import AsyncSessionLocal, get_db
from app.models.contact_message import ContactMessage
from app.models.user import User
from app.schemas.contact_message import ContactMessageCreate, ContactMessageRead
from app.services import email as email_service

logger = logging.getLogger("dentalhub")

router = APIRouter(tags=["contact"])


async def _send_and_record(
    message_id: uuid.UUID,
    name: str | None,
    email: str,
    subject: str | None,
    message: str,
) -> None:
    """
    Runs after the response has already gone back to the caller. smtplib is
    blocking, so it's pushed to a worker thread rather than run on the event
    loop — a stalled SMTP connection (e.g. a blocked outbound port) must not
    freeze every other request the server is handling.
    """
    try:
        sent = await asyncio.to_thread(
            email_service.send_contact_notification, name, email, subject, message
        )
    except Exception:
        logger.exception("Contact notification email failed for %s", message_id)
        return

    if not sent:
        return

    async with AsyncSessionLocal() as db:
        record = await db.get(ContactMessage, message_id)
        if record:
            record.email_sent = True
            await db.commit()


@router.post("/contact", response_model=ContactMessageRead, status_code=201)
async def submit_contact_message(
    body: ContactMessageCreate,
    background_tasks: BackgroundTasks,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> ContactMessageRead:
    """
    Public endpoint (no auth required) so the Landing page's Contact Us form
    works for visitors who haven't signed up yet. If the request does carry
    a valid Firebase token (the in-app Contact Us form), the message is
    tagged with that user for context.
    """
    record = ContactMessage(
        id=uuid.uuid4(),
        name=body.name,
        email=body.email,
        subject=body.subject,
        message=body.message,
        user_id=current_user.id if current_user else None,
        email_sent=False,
    )
    db.add(record)
    await db.flush()
    result = ContactMessageRead.model_validate(record)

    background_tasks.add_task(
        _send_and_record, record.id, body.name, body.email, body.subject, body.message
    )
    return result
