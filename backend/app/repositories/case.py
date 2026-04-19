from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.case import Case
from app.models.implant import Implant
from app.models.patient import Patient
from app.schemas.case import CaseCreate, CaseUpdate


class CaseRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(
        self,
        org_id: uuid.UUID,
        patient_id: uuid.UUID | None = None,
        page: int = 1,
        per_page: int = 50,
    ) -> list[Case]:
        q = (
            select(Case)
            .join(Patient, Case.patient_id == Patient.id)
            .where(Patient.org_id == org_id, Patient.deleted_at.is_(None))
        )
        if patient_id:
            q = q.where(Case.patient_id == patient_id)
        q = q.order_by(Case.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get(self, case_id: uuid.UUID, org_id: uuid.UUID) -> Case | None:
        result = await self.db.execute(
            select(Case)
            .join(Patient, Case.patient_id == Patient.id)
            .where(Case.id == case_id, Patient.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def create(
        self, doctor_id: uuid.UUID, data: CaseCreate
    ) -> Case:
        case = Case(
            id=uuid.uuid4(),
            doctor_id=doctor_id,
            **data.model_dump(),
        )
        self.db.add(case)
        await self.db.flush()
        return case

    async def update(self, case: Case, data: CaseUpdate) -> Case:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(case, field, value)
        self.db.add(case)
        await self.db.flush()
        return case

    async def delete(self, case: Case) -> None:
        await self.db.delete(case)
        await self.db.flush()

    async def dashboard_summary(self, org_id: uuid.UUID) -> dict:
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        fourteen_days = now + timedelta(days=14)

        # Total patients (non-deleted)
        total_patients = await self.db.scalar(
            select(func.count(Patient.id)).where(
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
        )

        # Active cases
        active_cases = await self.db.scalar(
            select(func.count(Case.id))
            .join(Patient, Case.patient_id == Patient.id)
            .where(Patient.org_id == org_id, Case.status == "active")
        )

        # Cases created this calendar month
        cases_this_month = await self.db.scalar(
            select(func.count(Case.id))
            .join(Patient, Case.patient_id == Patient.id)
            .where(
                Patient.org_id == org_id,
                Case.created_at >= month_start,
            )
        )

        # Upcoming follow-ups — implants whose follow_up_date is within 14 days
        # and osseointegration_success is not yet recorded
        upcoming_followups = await self.db.scalar(
            select(func.count(Implant.id))
            .join(Case, Implant.case_id == Case.id)
            .join(Patient, Case.patient_id == Patient.id)
            .where(
                Patient.org_id == org_id,
                Implant.follow_up_date.isnot(None),
                Implant.follow_up_date <= fourteen_days.date(),
                Implant.follow_up_date >= now.date(),
                Implant.osseointegration_success.is_(None),
            )
        )

        return {
            "total_patients": total_patients or 0,
            "active_cases": active_cases or 0,
            "cases_this_month": cases_this_month or 0,
            "upcoming_followups": upcoming_followups or 0,
        }
