from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.overdenture import OverdentureRepository
from app.schemas.overdenture import OverdentureCreate, OverdentureRead, OverdentureUpdate

router = APIRouter(tags=["overdentures"])


@router.get("/overdenture-records", response_model=list[OverdentureRead])
async def list_overdentures(
    patient_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[OverdentureRead]:
    repo = OverdentureRepository(db)
    records = await repo.list_by_patient(patient_id, current_user.org_id)
    return [OverdentureRead.model_validate(r) for r in records]


@router.post("/overdenture-records", response_model=OverdentureRead, status_code=201)
async def create_overdenture(
    body: OverdentureCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OverdentureRead:
    repo = OverdentureRepository(db)
    record = await repo.create(body)
    return OverdentureRead.model_validate(record)


@router.get("/overdenture-records/{overdenture_id}", response_model=OverdentureRead)
async def get_overdenture(
    overdenture_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OverdentureRead:
    repo = OverdentureRepository(db)
    record = await repo.get(overdenture_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Overdenture record not found")
    return OverdentureRead.model_validate(record)


@router.put("/overdenture-records/{overdenture_id}", response_model=OverdentureRead)
async def update_overdenture(
    overdenture_id: uuid.UUID,
    body: OverdentureUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OverdentureRead:
    repo = OverdentureRepository(db)
    record = await repo.get(overdenture_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Overdenture record not found")
    record = await repo.update(record, body)
    return OverdentureRead.model_validate(record)


@router.delete("/overdenture-records/{overdenture_id}")
async def delete_overdenture(
    overdenture_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = OverdentureRepository(db)
    record = await repo.get(overdenture_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Overdenture record not found")
    await repo.delete(record)
    return {"deleted": True}
