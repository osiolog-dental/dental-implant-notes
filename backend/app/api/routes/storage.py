from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.google_drive_connection import GoogleDriveConnection
from app.models.organization import Organization
from app.models.user import User
from app.repositories.google_drive import GoogleDriveRepository
from app.services import google_drive as drive_service

router = APIRouter(prefix="/storage", tags=["storage"])

VALID_BACKENDS = {"platform", "google_drive"}


@router.get("/status")
async def storage_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    org = (await db.execute(select(Organization).where(Organization.id == current_user.org_id))).scalar_one_or_none()
    conn = await GoogleDriveRepository(db).get(current_user.org_id)
    return {
        "backend": org.storage_backend if org else "platform",
        "google_drive_configured": drive_service.is_configured(),
        "google_drive_connected": conn is not None,
        "google_drive_email": conn.connected_email if conn else None,
    }


@router.get("/google-drive/connect-url")
async def google_drive_connect_url(
    current_user: User = Depends(get_current_user),
) -> dict:
    if not drive_service.is_configured():
        raise HTTPException(status_code=503, detail="Google Drive isn't configured on the server yet.")
    return {"url": drive_service.get_oauth_url(str(current_user.org_id))}


@router.get("/google-drive/callback")
async def google_drive_callback(
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """
    Google redirects here after the user approves (or denies) access.
    No auth dependency — this is a plain browser navigation from Google, not
    an authenticated API call — so the org is identified via the signed
    `state` param minted by /google-drive/connect-url instead.
    """
    settings_url = f"{settings.FRONTEND_URL}/subscription"

    if error or not code or not state:
        return RedirectResponse(f"{settings_url}?drive_error=access_denied")

    try:
        org_id = uuid.UUID(drive_service.verify_state(state))
    except ValueError:
        return RedirectResponse(f"{settings_url}?drive_error=invalid_state")

    try:
        tokens = drive_service.exchange_code(code)
        access_token = tokens["access_token"]
        refresh_token = tokens.get("refresh_token")
        if not refresh_token:
            # Happens if the user had already granted consent before and
            # Google skipped issuing a new refresh_token — ask them to
            # revoke access in their Google account and reconnect.
            return RedirectResponse(f"{settings_url}?drive_error=no_refresh_token")

        folder_id = drive_service.ensure_app_folder(access_token)
        email = drive_service.get_user_email(access_token)
    except Exception:
        return RedirectResponse(f"{settings_url}?drive_error=connect_failed")

    repo = GoogleDriveRepository(db)
    existing = await repo.get(org_id)
    if existing:
        await repo.delete(existing)

    conn = GoogleDriveConnection(
        id=uuid.uuid4(),
        org_id=org_id,
        access_token=access_token,
        refresh_token=refresh_token,
        token_expires_at=drive_service.token_expiry_from(tokens["expires_in"]),
        folder_id=folder_id,
        connected_email=email,
    )
    db.add(conn)
    await db.flush()

    return RedirectResponse(f"{settings_url}?drive_connected=1")


@router.delete("/google-drive")
async def disconnect_google_drive(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = GoogleDriveRepository(db)
    conn = await repo.get(current_user.org_id)
    if conn:
        drive_service.revoke(conn.access_token)
        await repo.delete(conn)

    org = (await db.execute(select(Organization).where(Organization.id == current_user.org_id))).scalar_one_or_none()
    if org and org.storage_backend == "google_drive":
        org.storage_backend = "platform"
        db.add(org)
        await db.flush()

    return {"disconnected": True}


class SetBackendBody(BaseModel):
    backend: str


@router.post("/backend")
async def set_storage_backend(
    body: SetBackendBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if body.backend not in VALID_BACKENDS:
        raise HTTPException(status_code=400, detail=f"backend must be one of: {', '.join(VALID_BACKENDS)}")

    if body.backend == "google_drive":
        conn = await GoogleDriveRepository(db).get(current_user.org_id)
        if not conn:
            raise HTTPException(status_code=400, detail="Connect your Google Drive account first")

    org = (await db.execute(select(Organization).where(Organization.id == current_user.org_id))).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.storage_backend = body.backend
    db.add(org)
    await db.flush()
    return {"backend": org.storage_backend}
