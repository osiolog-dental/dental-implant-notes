from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.implant import Implant
from app.models.implant_follow_up import ImplantFollowUp
from app.models.patient import Patient
from app.schemas.implant_follow_up import ImplantFollowUpCreate, ImplantFollowUpUpdate


class ImplantFollowUpRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_patient(self, patient_id: uuid.UUID, org_id: uuid.UUID) -> list[ImplantFollowUp]:
        result = await self.db.execute(
            select(ImplantFollowUp)
            .join(Patient, ImplantFollowUp.patient_id == Patient.id)
            .where(
                ImplantFollowUp.patient_id == patient_id,
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
            .order_by(ImplantFollowUp.follow_up_date.desc(), ImplantFollowUp.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, follow_up_id: uuid.UUID, org_id: uuid.UUID) -> ImplantFollowUp | None:
        result = await self.db.execute(
            select(ImplantFollowUp)
            .join(Patient, ImplantFollowUp.patient_id == Patient.id)
            .where(ImplantFollowUp.id == follow_up_id, Patient.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def _sync_implant(self, implant_id: uuid.UUID, osseointegration_success, peri_implant_health, prognosis) -> None:
        """
        Keep the parent Implant's latest-known status in sync with this
        follow-up, so existing Dashboard classification, reminders, and PDF
        export (which all read Implant.osseointegration_success /
        peri_implant_health / implant_outcome directly) stay accurate without
        needing to know follow-ups exist.
        """
        implant = await self.db.get(Implant, implant_id)
        if not implant:
            return
        if osseointegration_success is not None:
            implant.osseointegration_success = osseointegration_success
        if peri_implant_health is not None:
            implant.peri_implant_health = peri_implant_health
        if prognosis == "Guarded":
            implant.implant_outcome = "Guarded"
        elif prognosis == "Good" and (implant.implant_outcome or "").lower() == "guarded":
            implant.implant_outcome = "Success" if implant.osseointegration_success else "Pending"
        self.db.add(implant)

    async def create(self, data: ImplantFollowUpCreate) -> ImplantFollowUp:
        follow_up = ImplantFollowUp(id=uuid.uuid4(), **data.model_dump())
        self.db.add(follow_up)
        await self._sync_implant(
            data.implant_id, data.osseointegration_success, data.peri_implant_health, data.prognosis
        )
        await self.db.flush()
        return follow_up

    async def update(self, follow_up: ImplantFollowUp, data: ImplantFollowUpUpdate) -> ImplantFollowUp:
        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(follow_up, field, value)
        self.db.add(follow_up)
        await self._sync_implant(
            follow_up.implant_id,
            updates.get("osseointegration_success"),
            updates.get("peri_implant_health"),
            follow_up.prognosis,
        )
        await self.db.flush()
        return follow_up

    async def delete(self, follow_up: ImplantFollowUp) -> None:
        await self.db.delete(follow_up)
        await self.db.flush()
