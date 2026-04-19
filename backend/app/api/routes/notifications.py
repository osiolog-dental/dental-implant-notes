from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.audit import DeviceToken
from app.models.user import User
from app.services.notifications import send_followup_reminders

router = APIRouter(prefix="/notifications", tags=["notifications"])


class DeviceTokenIn(BaseModel):
    fcm_token: str
    platform: str  # "web" | "android" | "ios"


class DeviceTokenDelete(BaseModel):
    fcm_token: str


@router.post("/device-token", status_code=status.HTTP_204_NO_CONTENT)
async def upsert_device_token(
    body: DeviceTokenIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Register or refresh an FCM device token for the current user."""
    # Check if this exact token already exists for this user
    result = await db.execute(
        select(DeviceToken).where(
            DeviceToken.user_id == current_user.id,
            DeviceToken.fcm_token == body.fcm_token,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.platform = body.platform
    else:
        db.add(DeviceToken(
            user_id=current_user.id,
            fcm_token=body.fcm_token,
            platform=body.platform,
        ))

    await db.commit()


@router.delete("/device-token", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device_token(
    body: DeviceTokenDelete,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove an FCM device token on logout."""
    await db.execute(
        delete(DeviceToken).where(
            DeviceToken.user_id == current_user.id,
            DeviceToken.fcm_token == body.fcm_token,
        )
    )
    await db.commit()


@router.post("/test-reminder", status_code=status.HTTP_200_OK)
async def test_reminder(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Manually trigger the follow-up reminder job. Dev environment only."""
    if settings.ENVIRONMENT != "development":
        raise HTTPException(status_code=403, detail="Only available in development")
    await send_followup_reminders()
    return {"detail": "Follow-up reminder job triggered"}
