from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_optional
from app.db.session import get_db
from app.models.contact_message import ContactMessage
from app.models.user import User
from app.schemas.contact_message import ContactMessageCreate, ContactMessageRead
from app.services import email as email_service

router = APIRouter(tags=["contact"])


@router.post("/contact", response_model=ContactMessageRead, status_code=201)
async def submit_contact_message(
    body: ContactMessageCreate,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> ContactMessageRead:
    """
    Public endpoint (no auth required) so the Landing page's Contact Us form
    works for visitors who haven't signed up yet. If the request does carry
    a valid Firebase token (the in-app Contact Us form), the message is
    tagged with that user for context.
    """
    sent = email_service.send_contact_notification(body.name, body.email, body.subject, body.message)

    record = ContactMessage(
        id=uuid.uuid4(),
        name=body.name,
        email=body.email,
        subject=body.subject,
        message=body.message,
        user_id=current_user.id if current_user else None,
        email_sent=sent,
    )
    db.add(record)
    await db.flush()
    return ContactMessageRead.model_validate(record)
