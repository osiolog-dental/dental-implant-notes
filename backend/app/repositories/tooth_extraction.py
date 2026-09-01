from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tooth_extraction import ToothExtraction
from app.models.patient import Patient
from app.schemas.tooth_extraction import ToothExtractionCreate, ToothExtractionUpdate


class ToothExtractionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_patient(self, patient_id: uuid.UUID, org_id: uuid.UUID) -> list[ToothExtraction]:
        result = await self.db.execute(
            select(ToothExtraction)
            .join(Patient, ToothExtraction.patient_id == Patient.id)
            .where(
                ToothExtraction.patient_id == patient_id,
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
            .order_by(ToothExtraction.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, extraction_id: uuid.UUID, org_id: uuid.UUID) -> ToothExtraction | None:
        result = await self.db.execute(
            select(ToothExtraction)
            .join(Patient, ToothExtraction.patient_id == Patient.id)
            .where(ToothExtraction.id == extraction_id, Patient.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: ToothExtractionCreate) -> ToothExtraction:
        extraction = ToothExtraction(id=uuid.uuid4(), **data.model_dump())
        self.db.add(extraction)
        await self.db.flush()
        return extraction

    async def update(self, extraction: ToothExtraction, data: ToothExtractionUpdate) -> ToothExtraction:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(extraction, field, value)
        self.db.add(extraction)
        await self.db.flush()
        return extraction

    async def delete(self, extraction: ToothExtraction) -> None:
        await self.db.delete(extraction)
        await self.db.flush()
