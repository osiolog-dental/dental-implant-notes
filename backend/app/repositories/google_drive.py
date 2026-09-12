from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.google_drive_connection import GoogleDriveConnection
from app.services import google_drive as drive_service


class GoogleDriveRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, org_id: uuid.UUID) -> GoogleDriveConnection | None:
        result = await self.db.execute(
            select(GoogleDriveConnection).where(GoogleDriveConnection.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def delete(self, connection: GoogleDriveConnection) -> None:
        await self.db.delete(connection)
        await self.db.flush()

    async def get_valid_access_token(self, org_id: uuid.UUID) -> tuple[str, str] | None:
        """
        Returns (access_token, folder_id) for the org's connected Drive,
        refreshing and persisting a new access token first if the stored one
        has expired. Returns None if the org has no connection.
        """
        conn = await self.get(org_id)
        if not conn:
            return None

        if conn.token_expires_at <= datetime.now(timezone.utc):
            tokens = drive_service.refresh_access_token(conn.refresh_token)
            conn.access_token = tokens["access_token"]
            conn.token_expires_at = drive_service.token_expiry_from(tokens["expires_in"])
            self.db.add(conn)
            await self.db.flush()

        return conn.access_token, conn.folder_id
