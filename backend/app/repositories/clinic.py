from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clinic import Clinic
from app.schemas.clinic import ClinicCreate, ClinicUpdate


class ClinicRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(self, org_id: uuid.UUID) -> list[Clinic]:
        result = await self.db.execute(
            select(Clinic)
            .where(Clinic.org_id == org_id)
            .order_by(Clinic.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, clinic_id: uuid.UUID, org_id: uuid.UUID) -> Clinic | None:
        result = await self.db.execute(
            select(Clinic).where(Clinic.id == clinic_id, Clinic.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def create(self, org_id: uuid.UUID, data: ClinicCreate) -> Clinic:
        clinic = Clinic(id=uuid.uuid4(), org_id=org_id, **data.model_dump())
        self.db.add(clinic)
        await self.db.flush()
        return clinic

    async def update(self, clinic: Clinic, data: ClinicUpdate) -> Clinic:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(clinic, field, value)
        self.db.add(clinic)
        await self.db.flush()
        return clinic

    async def delete(self, clinic: Clinic) -> None:
        await self.db.delete(clinic)
        await self.db.flush()
