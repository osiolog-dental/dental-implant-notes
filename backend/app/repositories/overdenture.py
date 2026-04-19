from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.overdenture import Overdenture
from app.models.patient import Patient
from app.schemas.overdenture import OverdentureCreate, OverdentureUpdate


class OverdentureRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_patient(self, patient_id: uuid.UUID, org_id: uuid.UUID) -> list[Overdenture]:
        result = await self.db.execute(
            select(Overdenture)
            .join(Patient, Overdenture.patient_id == Patient.id)
            .where(
                Overdenture.patient_id == patient_id,
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
            .order_by(Overdenture.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, overdenture_id: uuid.UUID, org_id: uuid.UUID) -> Overdenture | None:
        result = await self.db.execute(
            select(Overdenture)
            .join(Patient, Overdenture.patient_id == Patient.id)
            .where(Overdenture.id == overdenture_id, Patient.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: OverdentureCreate) -> Overdenture:
        overdenture = Overdenture(id=uuid.uuid4(), **data.model_dump())
        self.db.add(overdenture)
        await self.db.flush()
        return overdenture

    async def update(self, overdenture: Overdenture, data: OverdentureUpdate) -> Overdenture:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(overdenture, field, value)
        self.db.add(overdenture)
        await self.db.flush()
        return overdenture

    async def delete(self, overdenture: Overdenture) -> None:
        await self.db.delete(overdenture)
        await self.db.flush()
