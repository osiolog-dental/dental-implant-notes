from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.abutment import AbutmentRepository
from app.schemas.abutment import AbutmentCreate, AbutmentRead, AbutmentUpdate

router = APIRouter(tags=["abutments"])


@router.get("/abutment-records", response_model=list[AbutmentRead])
async def list_abutments(
    patient_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AbutmentRead]:
    repo = AbutmentRepository(db)
    records = await repo.list_by_patient(patient_id, current_user.org_id)
    return [AbutmentRead.model_validate(r) for r in records]


@router.post("/abutment-records", response_model=AbutmentRead, status_code=201)
async def create_abutment(
    body: AbutmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AbutmentRead:
    repo = AbutmentRepository(db)
    record = await repo.create(body)
    return AbutmentRead.model_validate(record)


@router.get("/abutment-records/{abutment_id}", response_model=AbutmentRead)
async def get_abutment(
    abutment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AbutmentRead:
    repo = AbutmentRepository(db)
    record = await repo.get(abutment_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Abutment record not found")
    return AbutmentRead.model_validate(record)


@router.put("/abutment-records/{abutment_id}", response_model=AbutmentRead)
async def update_abutment(
    abutment_id: uuid.UUID,
    body: AbutmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AbutmentRead:
    repo = AbutmentRepository(db)
    record = await repo.get(abutment_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Abutment record not found")
    record = await repo.update(record, body)
    return AbutmentRead.model_validate(record)


@router.delete("/abutment-records/{abutment_id}")
async def delete_abutment(
    abutment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = AbutmentRepository(db)
    record = await repo.get(abutment_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Abutment record not found")
    await repo.delete(record)
    return {"deleted": True}
