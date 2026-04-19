from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fpd import ProstheticFPD
from app.models.patient import Patient
from app.schemas.fpd import FPDCreate, FPDUpdate


class FPDRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_case(self, case_id: uuid.UUID, org_id: uuid.UUID) -> list[ProstheticFPD]:
        result = await self.db.execute(
            select(ProstheticFPD)
            .join(Patient, ProstheticFPD.patient_id == Patient.id)
            .where(
                ProstheticFPD.case_id == case_id,
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
            .order_by(ProstheticFPD.created_at.asc())
        )
        return list(result.scalars().all())

    async def list_by_patient(self, patient_id: uuid.UUID, org_id: uuid.UUID) -> list[ProstheticFPD]:
        result = await self.db.execute(
            select(ProstheticFPD)
            .join(Patient, ProstheticFPD.patient_id == Patient.id)
            .where(
                ProstheticFPD.patient_id == patient_id,
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
            .order_by(ProstheticFPD.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, fpd_id: uuid.UUID, org_id: uuid.UUID) -> ProstheticFPD | None:
        result = await self.db.execute(
            select(ProstheticFPD)
            .join(Patient, ProstheticFPD.patient_id == Patient.id)
            .where(ProstheticFPD.id == fpd_id, Patient.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: FPDCreate) -> ProstheticFPD:
        fpd = ProstheticFPD(id=uuid.uuid4(), **data.model_dump())
        self.db.add(fpd)
        await self.db.flush()
        return fpd

    async def update(self, fpd: ProstheticFPD, data: FPDUpdate) -> ProstheticFPD:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(fpd, field, value)
        self.db.add(fpd)
        await self.db.flush()
        return fpd

    async def delete(self, fpd: ProstheticFPD) -> None:
        await self.db.delete(fpd)
        await self.db.flush()
