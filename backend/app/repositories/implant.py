from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.implant import Implant
from app.models.patient import Patient
from app.schemas.implant import ImplantCreate, ImplantUpdate


class ImplantRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_case(self, case_id: uuid.UUID, org_id: uuid.UUID) -> list[Implant]:
        """List all implants for a case, verify org ownership via patient."""
        result = await self.db.execute(
            select(Implant)
            .join(Patient, Implant.patient_id == Patient.id)
            .where(
                Implant.case_id == case_id,
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
            .order_by(Implant.created_at.asc())
        )
        return list(result.scalars().all())

    async def list_by_patient(self, patient_id: uuid.UUID, org_id: uuid.UUID) -> list[Implant]:
        """List all implants for a patient across all cases."""
        result = await self.db.execute(
            select(Implant)
            .join(Patient, Implant.patient_id == Patient.id)
            .where(
                Implant.patient_id == patient_id,
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
            .order_by(Implant.surgery_date.desc().nulls_last(), Implant.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, implant_id: uuid.UUID, org_id: uuid.UUID) -> Implant | None:
        result = await self.db.execute(
            select(Implant)
            .join(Patient, Implant.patient_id == Patient.id)
            .where(Implant.id == implant_id, Patient.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: ImplantCreate) -> Implant:
        implant = Implant(id=uuid.uuid4(), **data.model_dump())
        self.db.add(implant)
        await self.db.flush()
        return implant

    async def update(self, implant: Implant, data: ImplantUpdate) -> Implant:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(implant, field, value)
        self.db.add(implant)
        await self.db.flush()
        return implant

    async def delete(self, implant: Implant) -> None:
        await self.db.delete(implant)
        await self.db.flush()
