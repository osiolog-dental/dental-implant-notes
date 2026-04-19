from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import auth as firebase_auth
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.audit import AuditEvent, DeviceToken
from app.models.user import User
from app.models.organization import Organization
from app.schemas.user import UserRead, UserUpdate

logger = logging.getLogger("dentalhub")

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/me", response_model=UserRead)
async def update_me(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    """Update the current doctor's profile fields. Only provided fields are changed."""
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.add(current_user)
    await db.flush()
    return UserRead.model_validate(current_user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Permanently delete the current doctor's account.
    Required by Apple App Store and Google Play Store policies.

    Deletes in order:
    1. FCM device tokens (cascade via FK but explicit for clarity)
    2. Firebase Auth account
    3. PostgreSQL user row (cascades to org, patients, cases, implants via FK)
    """
    firebase_uid = current_user.firebase_uid
    org_id = current_user.org_id

    # Delete Firebase account first — if this fails, abort cleanly
    if firebase_uid:
        try:
            firebase_auth.delete_user(firebase_uid)
        except Exception as exc:
            logger.error("Firebase delete_user failed for uid=%s: %s", firebase_uid, exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete Firebase account. Please try again.",
            )

    # Delete device tokens
    await db.execute(delete(DeviceToken).where(DeviceToken.user_id == current_user.id))

    # Delete the user row — cascades to patients, cases, implants etc. via ON DELETE CASCADE
    await db.delete(current_user)
    await db.flush()

    # Delete the org if this was the only user (solo doctor setup)
    org = await db.get(Organization, org_id)
    if org:
        await db.delete(org)
        await db.flush()
