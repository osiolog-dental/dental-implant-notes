from __future__ import annotations

import logging

import requests as _requests
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.audit import AuditEvent, DeviceToken
from app.models.user import User
from app.models.organization import Organization
from app.schemas.user import UserRead, UserUpdate

logger = logging.getLogger("dentalhub")

router = APIRouter(prefix="/users", tags=["users"])

_FIREBASE_DELETE_URL = (
    "https://identitytoolkit.googleapis.com/v1/accounts:delete?key={api_key}"
)


def _delete_firebase_user(id_token: str) -> None:
    """
    Delete the Firebase Auth account using the user's own ID token.
    Uses the Firebase REST API — no service account needed.
    Raises HTTPException on failure.
    """
    api_key = settings.FIREBASE_API_KEY
    if not api_key:
        logger.warning("FIREBASE_API_KEY not set — skipping Firebase account deletion")
        return

    resp = _requests.post(
        _FIREBASE_DELETE_URL.format(api_key=api_key),
        json={"idToken": id_token},
        timeout=10,
    )
    if resp.status_code != 200:
        logger.error("Firebase REST delete failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete Firebase account. Please try again.",
        )


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


@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Permanently delete the current doctor's account.
    Required by Apple App Store and Google Play Store policies.

    Deletes in order:
    1. Firebase Auth account (via REST API using the user's own ID token)
    2. FCM device tokens
    3. PostgreSQL user row (cascades to org, patients, cases, implants via FK)
    """
    org_id = current_user.org_id

    # Extract the ID token from the Authorization header to delete Firebase account
    auth_header = request.headers.get("Authorization", "")
    id_token = auth_header.removeprefix("Bearer ").strip()
    if id_token:
        _delete_firebase_user(id_token)

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

    return {"detail": "Account deleted"}
