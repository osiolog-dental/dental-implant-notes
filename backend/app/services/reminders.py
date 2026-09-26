"""
The three clinical "due" queries, in one place.

These were written inline in route handlers. They moved here when the daily
reminder email needed them too: a scheduled job cannot call an HTTP route, and
copying the queries would let the email and the app quietly disagree about what
is due — the kind of divergence a dentist would only notice as a missed recall.

Every function is org-scoped, matching what the app itself shows: routes filter
patients by `org_id`, so the email reports exactly what the doctor would see in
the bell.

Return shapes are the endpoints' JSON, unchanged, because the routes now
delegate here.
"""
from __future__ import annotations

import uuid
from datetime import date as _date, timedelta as _timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.implant import Implant
from app.models.patient import Patient
from app.models.tooth_extraction import ToothExtraction

# Matches the FCM follow-up job, so the bell, the push and the email agree.
FOLLOW_UP_WINDOW_DAYS = 7

# A failed implant is either still in the bone waiting to be removed, or gone —
# either way it is not healing, not due a second stage, and not due a follow-up.
# Case-insensitive because older rows were typed in by hand.
NOT_FAILED = func.lower(func.coalesce(Implant.implant_outcome, '')) != 'failed'


async def follow_ups_due(db: AsyncSession, org_id: uuid.UUID) -> list[dict]:
    """
    Implant follow-ups due within the next 7 days, due today, or already past
    without an outcome recorded.

    Past-dated follow-ups are kept deliberately — the push job filters them out,
    and a date that slipped by is exactly the one worth surfacing.
    """
    today = _date.today()
    window_end = today + _timedelta(days=FOLLOW_UP_WINDOW_DAYS)

    result = await db.execute(
        select(Implant, Patient)
        .join(Patient, Implant.patient_id == Patient.id)
        .where(
            Patient.org_id == org_id,
            Patient.deleted_at.is_(None),
            Implant.follow_up_date.isnot(None),
            Implant.follow_up_date <= window_end,
            Implant.osseointegration_success.is_(None),
            NOT_FAILED,
        )
    )

    due = [
        {
            "implant_id": str(implant.id),
            "patient_id": str(patient.id),
            "patient_name": patient.name,
            "tooth_number": implant.tooth_number,
            "brand": implant.brand,
            "follow_up_date": implant.follow_up_date.isoformat(),
            # negative = overdue by that many days, 0 = due today
            "days_until": (implant.follow_up_date - today).days,
        }
        for implant, patient in result.all()
    ]

    # Most overdue first, then today, then the coming week.
    return sorted(due, key=lambda x: x["days_until"])


async def second_stage_due(db: AsyncSession, org_id: uuid.UUID) -> list[dict]:
    """Stage-1 implants that have passed their own osseointegration period."""
    result = await db.execute(
        select(Implant, Patient)
        .join(Patient, Implant.patient_id == Patient.id)
        .where(
            Patient.org_id == org_id,
            Patient.deleted_at.is_(None),
            Implant.surgery_date.isnot(None),
            Implant.current_stage == 1,
            NOT_FAILED,
        )
    )
    rows = result.all()

    today = _date.today()
    due = []
    for implant, patient in rows:
        days_elapsed = (today - implant.surgery_date).days
        if days_elapsed >= implant.osseointegration_days:
            due.append({
                "implant_id": str(implant.id),
                "patient_id": str(patient.id),
                "patient_name": patient.name,
                "tooth_number": implant.tooth_number,
                "brand": implant.brand,
                "case_number": None,
                "days_elapsed": days_elapsed,
                "osseointegration_days": implant.osseointegration_days,
                "surgery_date": implant.surgery_date.isoformat(),
            })

    return sorted(due, key=lambda x: x["days_elapsed"], reverse=True)


async def extraction_sites_due(db: AsyncSession, org_id: uuid.UUID) -> list[dict]:
    """
    Extraction sites planned for a future implant where the doctor's own
    countdown has elapsed and no implant has been logged at that tooth yet.
    """
    result = await db.execute(
        select(ToothExtraction, Patient)
        .join(Patient, ToothExtraction.patient_id == Patient.id)
        .where(
            Patient.org_id == org_id,
            Patient.deleted_at.is_(None),
            ToothExtraction.planned_future_implant.is_(True),
            ToothExtraction.reminder_days.isnot(None),
        )
    )
    rows = result.all()

    # Implants already placed, keyed by (patient_id, tooth_number) — suppresses
    # the reminder once the planned implant has actually been logged.
    implant_result = await db.execute(
        select(Implant.patient_id, Implant.tooth_number)
        .join(Patient, Implant.patient_id == Patient.id)
        # A failed implant doesn't fill the site — a re-implant is still due.
        .where(Patient.org_id == org_id, Patient.deleted_at.is_(None), NOT_FAILED)
    )
    implanted_sites = {(pid, tn) for pid, tn in implant_result.all()}

    today = _date.today()
    due = []
    for extraction, patient in rows:
        pending_teeth = [
            tn for tn in extraction.tooth_numbers
            if (patient.id, tn) not in implanted_sites
        ]
        if not pending_teeth:
            continue
        days_elapsed = (today - extraction.extraction_date).days
        if days_elapsed >= extraction.reminder_days:
            due.append({
                "extraction_id": str(extraction.id),
                "patient_id": str(patient.id),
                "patient_name": patient.name,
                "tooth_numbers": pending_teeth,
                "days_elapsed": days_elapsed,
                "reminder_days": extraction.reminder_days,
                "extraction_date": extraction.extraction_date.isoformat(),
            })

    return sorted(due, key=lambda x: x["days_elapsed"], reverse=True)
