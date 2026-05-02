from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.case import Case
from app.models.clinic import Clinic
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
        # Use a direct SQL DELETE so PostgreSQL's ondelete=CASCADE handles
        # child rows (case_images, implants, fpd_records) without SQLAlchemy
        # trying to lazy-load those relationships in async context.
        await self.db.execute(delete(Case).where(Case.id == case.id))
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

        # Upcoming follow-ups — join via patient_id (case_id may be null for flat-created implants)
        upcoming_followups = await self.db.scalar(
            select(func.count(Implant.id))
            .join(Patient, Implant.patient_id == Patient.id)
            .where(
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
                Implant.follow_up_date.isnot(None),
                Implant.follow_up_date <= fourteen_days.date(),
                Implant.follow_up_date >= now.date(),
                Implant.osseointegration_success.is_(None),
            )
        )

        # Total implants across all patients in this org
        total_implants = await self.db.scalar(
            select(func.count(Implant.id))
            .join(Patient, Implant.patient_id == Patient.id)
            .where(
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
        )

        # Total clinics for this org
        total_clinics = await self.db.scalar(
            select(func.count(Clinic.id)).where(Clinic.org_id == org_id)
        )

        # Implants still in healing phase (stage 1)
        pending_osseointegration = await self.db.scalar(
            select(func.count(Implant.id))
            .join(Patient, Implant.patient_id == Patient.id)
            .where(
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
                Implant.current_stage == 1,
            )
        )

        return {
            "total_patients": total_patients or 0,
            "active_cases": active_cases or 0,
            "cases_this_month": cases_this_month or 0,
            "upcoming_followups": upcoming_followups or 0,
            "total_implants": total_implants or 0,
            "total_clinics": total_clinics or 0,
            "pending_osseointegration": pending_osseointegration or 0,
        }
