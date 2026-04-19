from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate


class PatientRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(
        self,
        org_id: uuid.UUID,
        search: str | None = None,
        page: int = 1,
        per_page: int = 50,
    ) -> list[Patient]:
        q = (
            select(Patient)
            .where(Patient.org_id == org_id, Patient.deleted_at.is_(None))
        )
        if search:
            q = q.where(Patient.name.ilike(f"%{search}%"))
        q = q.order_by(Patient.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get(self, patient_id: uuid.UUID, org_id: uuid.UUID) -> Patient | None:
        result = await self.db.execute(
            select(Patient).where(
                Patient.id == patient_id,
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self, org_id: uuid.UUID, doctor_id: uuid.UUID, data: PatientCreate
    ) -> Patient:
        patient = Patient(
            id=uuid.uuid4(),
            org_id=org_id,
            doctor_id=doctor_id,
            **data.model_dump(),
        )
        self.db.add(patient)
        await self.db.flush()
        return patient

    async def update(self, patient: Patient, data: PatientUpdate) -> Patient:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(patient, field, value)
        self.db.add(patient)
        await self.db.flush()
        return patient

    async def soft_delete(self, patient: Patient) -> None:
        from datetime import datetime, timezone
        patient.deleted_at = datetime.now(timezone.utc)
        self.db.add(patient)
        await self.db.flush()
