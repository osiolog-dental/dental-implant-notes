from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.full_mouth_rehab import FullMouthRehab
from app.models.patient import Patient
from app.schemas.full_mouth_rehab import FullMouthRehabCreate, FullMouthRehabUpdate


class FullMouthRehabRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_patient(self, patient_id: uuid.UUID, org_id: uuid.UUID) -> list[FullMouthRehab]:
        result = await self.db.execute(
            select(FullMouthRehab)
            .join(Patient, FullMouthRehab.patient_id == Patient.id)
            .where(
                FullMouthRehab.patient_id == patient_id,
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
            .order_by(FullMouthRehab.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, rehab_id: uuid.UUID, org_id: uuid.UUID) -> FullMouthRehab | None:
        result = await self.db.execute(
            select(FullMouthRehab)
            .join(Patient, FullMouthRehab.patient_id == Patient.id)
            .where(FullMouthRehab.id == rehab_id, Patient.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: FullMouthRehabCreate) -> FullMouthRehab:
        rehab = FullMouthRehab(id=uuid.uuid4(), **data.model_dump())
        self.db.add(rehab)
        await self.db.flush()
        return rehab

    async def update(self, rehab: FullMouthRehab, data: FullMouthRehabUpdate) -> FullMouthRehab:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(rehab, field, value)
        self.db.add(rehab)
        await self.db.flush()
        return rehab

    async def delete(self, rehab: FullMouthRehab) -> None:
        await self.db.delete(rehab)
        await self.db.flush()
