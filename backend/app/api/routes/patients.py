from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.patient import PatientRepository
from app.schemas.patient import PatientCreate, PatientRead, PatientUpdate
from app.services.audit import log_event
from pydantic import BaseModel


class ToothConditionsBody(BaseModel):
    tooth_conditions: dict

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=list[PatientRead])
async def list_patients(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PatientRead]:
    repo = PatientRepository(db)
    patients = await repo.list(current_user.org_id, search=search, page=page, per_page=per_page)
    return [PatientRead.model_validate(p) for p in patients]


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
async def create_patient(
    body: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PatientRead:
    repo = PatientRepository(db)
    patient = await repo.create(current_user.org_id, current_user.id, body)
    await log_event(db, org_id=current_user.org_id, user_id=current_user.id,
                    action="create", entity_type="patient", entity_id=str(patient.id))
    return PatientRead.model_validate(patient)


@router.get("/{patient_id}", response_model=PatientRead)
async def get_patient(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PatientRead:
    repo = PatientRepository(db)
    patient = await repo.get(patient_id, current_user.org_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return PatientRead.model_validate(patient)


@router.patch("/{patient_id}", response_model=PatientRead)
async def update_patient(
    patient_id: uuid.UUID,
    body: PatientUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PatientRead:
    repo = PatientRepository(db)
    patient = await repo.get(patient_id, current_user.org_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient = await repo.update(patient, body)
    await log_event(db, org_id=current_user.org_id, user_id=current_user.id,
                    action="update", entity_type="patient", entity_id=str(patient_id))
    return PatientRead.model_validate(patient)


@router.patch("/{patient_id}/tooth-conditions", response_model=PatientRead)
async def update_tooth_conditions(
    patient_id: uuid.UUID,
    body: ToothConditionsBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PatientRead:
    repo = PatientRepository(db)
    patient = await repo.get(patient_id, current_user.org_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.tooth_conditions = body.tooth_conditions
    db.add(patient)
    await db.flush()
    return PatientRead.model_validate(patient)


@router.delete("/{patient_id}", status_code=status.HTTP_200_OK)
async def delete_patient(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = PatientRepository(db)
    patient = await repo.get(patient_id, current_user.org_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    await repo.soft_delete(patient)
    await log_event(db, org_id=current_user.org_id, user_id=current_user.id,
                    action="delete", entity_type="patient", entity_id=str(patient_id))
    return {"deleted": True}
