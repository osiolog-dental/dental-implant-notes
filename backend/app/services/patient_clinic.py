"""
A patient's clinic follows their implants and abutments — but only to fill a gap.

When an implant or abutment is saved with a clinic and the patient has no
clinic yet, that clinic becomes the patient's clinic. A patient who already
has a clinic is never changed here: picking a different clinic for one implant
is a deliberate choice for that implant, not a move of the whole patient.
(User decision, 2026-09-26 — docs/DECISIONS.md D-021.)
"""
from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clinic import Clinic
from app.models.patient import Patient


def _as_uuid(v) -> uuid.UUID | None:
    if v is None or v == '':
        return None
    try:
        return v if isinstance(v, uuid.UUID) else uuid.UUID(str(v))
    except (ValueError, TypeError):
        return None  # implants.clinic_id is free text on older rows


async def clinic_in_org(db: AsyncSession, clinic_id, org_id: uuid.UUID) -> bool:
    cid = _as_uuid(clinic_id)
    if cid is None:
        return False
    found = (await db.execute(select(Clinic.id).where(Clinic.id == cid, Clinic.org_id == org_id))).scalar_one_or_none()
    return found is not None


async def require_own_patient(db: AsyncSession, patient_id, org_id: uuid.UUID) -> None:
    """An implant or abutment may only be added to a patient in the caller's own practice."""
    found = (await db.execute(
        select(Patient.id).where(Patient.id == patient_id, Patient.org_id == org_id, Patient.deleted_at.is_(None))
    )).scalar_one_or_none()
    if found is None:
        raise HTTPException(status_code=404, detail="Patient not found")


async def adopt_clinic_if_empty(db: AsyncSession, patient_id, org_id: uuid.UUID, clinic_id) -> None:
    """Give the patient this clinic if they have none. Scoped to the caller's practice."""
    cid = _as_uuid(clinic_id)
    if cid is None or not await clinic_in_org(db, cid, org_id):
        return
    patient = (await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.org_id == org_id, Patient.deleted_at.is_(None))
    )).scalar_one_or_none()
    if patient is not None and patient.clinic_id is None:
        patient.clinic_id = cid
        await db.flush()
