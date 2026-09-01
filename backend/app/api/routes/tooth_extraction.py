from __future__ import annotations

import uuid
from datetime import date as _date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.implant import Implant
from app.models.patient import Patient
from app.models.tooth_extraction import ToothExtraction
from app.models.user import User
from app.repositories.tooth_extraction import ToothExtractionRepository
from app.schemas.tooth_extraction import ToothExtractionCreate, ToothExtractionRead, ToothExtractionUpdate

router = APIRouter(tags=["tooth-extractions"])


@router.get("/tooth-extractions", response_model=list[ToothExtractionRead])
async def list_tooth_extractions(
    patient_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ToothExtractionRead]:
    repo = ToothExtractionRepository(db)
    records = await repo.list_by_patient(patient_id, current_user.org_id)
    return [ToothExtractionRead.model_validate(r) for r in records]


@router.post("/tooth-extractions", response_model=ToothExtractionRead, status_code=201)
async def create_tooth_extraction(
    body: ToothExtractionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ToothExtractionRead:
    repo = ToothExtractionRepository(db)
    record = await repo.create(body)
    return ToothExtractionRead.model_validate(record)


@router.get("/tooth-extractions/{extraction_id}", response_model=ToothExtractionRead)
async def get_tooth_extraction(
    extraction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ToothExtractionRead:
    repo = ToothExtractionRepository(db)
    record = await repo.get(extraction_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Extraction record not found")
    return ToothExtractionRead.model_validate(record)


@router.put("/tooth-extractions/{extraction_id}", response_model=ToothExtractionRead)
async def update_tooth_extraction(
    extraction_id: uuid.UUID,
    body: ToothExtractionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ToothExtractionRead:
    repo = ToothExtractionRepository(db)
    record = await repo.get(extraction_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Extraction record not found")
    record = await repo.update(record, body)
    return ToothExtractionRead.model_validate(record)


@router.delete("/tooth-extractions/{extraction_id}")
async def delete_tooth_extraction(
    extraction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = ToothExtractionRepository(db)
    record = await repo.get(extraction_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Extraction record not found")
    await repo.delete(record)
    return {"deleted": True}


@router.get("/tooth-extractions/due/for-implant")
async def extractions_due_for_implant(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    """
    Extraction sites planned for a future implant where the doctor's custom
    countdown has elapsed and no implant has been logged at that tooth yet.
    """
    result = await db.execute(
        select(ToothExtraction, Patient)
        .join(Patient, ToothExtraction.patient_id == Patient.id)
        .where(
            Patient.org_id == current_user.org_id,
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
        .where(Patient.org_id == current_user.org_id, Patient.deleted_at.is_(None))
    )
    implanted_sites = {(pid, tn) for pid, tn in implant_result.all()}

    today = _date.today()
    due = []
    for extraction, patient in rows:
        pending_teeth = [tn for tn in extraction.tooth_numbers if (patient.id, tn) not in implanted_sites]
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
