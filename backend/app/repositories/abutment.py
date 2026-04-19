from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.abutment import Abutment
from app.models.patient import Patient
from app.schemas.abutment import AbutmentCreate, AbutmentUpdate


class AbutmentRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_patient(self, patient_id: uuid.UUID, org_id: uuid.UUID) -> list[Abutment]:
        result = await self.db.execute(
            select(Abutment)
            .join(Patient, Abutment.patient_id == Patient.id)
            .where(
                Abutment.patient_id == patient_id,
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
            .order_by(Abutment.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, abutment_id: uuid.UUID, org_id: uuid.UUID) -> Abutment | None:
        result = await self.db.execute(
            select(Abutment)
            .join(Patient, Abutment.patient_id == Patient.id)
            .where(Abutment.id == abutment_id, Patient.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: AbutmentCreate) -> Abutment:
        abutment = Abutment(id=uuid.uuid4(), **data.model_dump())
        self.db.add(abutment)
        await self.db.flush()
        return abutment

    async def update(self, abutment: Abutment, data: AbutmentUpdate) -> Abutment:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(abutment, field, value)
        self.db.add(abutment)
        await self.db.flush()
        return abutment

    async def delete(self, abutment: Abutment) -> None:
        await self.db.delete(abutment)
        await self.db.flush()
