from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.full_mouth_rehab import FullMouthRehabRepository
from app.schemas.full_mouth_rehab import FullMouthRehabCreate, FullMouthRehabRead, FullMouthRehabUpdate

router = APIRouter(tags=["full-mouth-rehab"])


@router.get("/full-mouth-rehab-records", response_model=list[FullMouthRehabRead])
async def list_full_mouth_rehabs(
    patient_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FullMouthRehabRead]:
    repo = FullMouthRehabRepository(db)
    records = await repo.list_by_patient(patient_id, current_user.org_id)
    return [FullMouthRehabRead.model_validate(r) for r in records]


@router.post("/full-mouth-rehab-records", response_model=FullMouthRehabRead, status_code=201)
async def create_full_mouth_rehab(
    body: FullMouthRehabCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FullMouthRehabRead:
    repo = FullMouthRehabRepository(db)
    record = await repo.create(body)
    return FullMouthRehabRead.model_validate(record)


@router.get("/full-mouth-rehab-records/{rehab_id}", response_model=FullMouthRehabRead)
async def get_full_mouth_rehab(
    rehab_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FullMouthRehabRead:
    repo = FullMouthRehabRepository(db)
    record = await repo.get(rehab_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Full mouth rehab record not found")
    return FullMouthRehabRead.model_validate(record)


@router.put("/full-mouth-rehab-records/{rehab_id}", response_model=FullMouthRehabRead)
async def update_full_mouth_rehab(
    rehab_id: uuid.UUID,
    body: FullMouthRehabUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FullMouthRehabRead:
    repo = FullMouthRehabRepository(db)
    record = await repo.get(rehab_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Full mouth rehab record not found")
    record = await repo.update(record, body)
    return FullMouthRehabRead.model_validate(record)


@router.delete("/full-mouth-rehab-records/{rehab_id}")
async def delete_full_mouth_rehab(
    rehab_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = FullMouthRehabRepository(db)
    record = await repo.get(rehab_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Full mouth rehab record not found")
    await repo.delete(record)
    return {"deleted": True}
