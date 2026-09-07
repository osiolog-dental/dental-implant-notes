from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.implant_follow_up import ImplantFollowUpRepository
from app.schemas.implant_follow_up import ImplantFollowUpCreate, ImplantFollowUpRead, ImplantFollowUpUpdate

router = APIRouter(tags=["implant-follow-ups"])


@router.get("/implant-follow-ups", response_model=list[ImplantFollowUpRead])
async def list_implant_follow_ups(
    patient_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ImplantFollowUpRead]:
    repo = ImplantFollowUpRepository(db)
    records = await repo.list_by_patient(patient_id, current_user.org_id)
    return [ImplantFollowUpRead.model_validate(r) for r in records]


@router.post("/implant-follow-ups", response_model=ImplantFollowUpRead, status_code=201)
async def create_implant_follow_up(
    body: ImplantFollowUpCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImplantFollowUpRead:
    repo = ImplantFollowUpRepository(db)
    record = await repo.create(body)
    return ImplantFollowUpRead.model_validate(record)


@router.patch("/implant-follow-ups/{follow_up_id}", response_model=ImplantFollowUpRead)
async def update_implant_follow_up(
    follow_up_id: uuid.UUID,
    body: ImplantFollowUpUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImplantFollowUpRead:
    repo = ImplantFollowUpRepository(db)
    record = await repo.get(follow_up_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Follow-up record not found")
    record = await repo.update(record, body)
    return ImplantFollowUpRead.model_validate(record)


@router.delete("/implant-follow-ups/{follow_up_id}")
async def delete_implant_follow_up(
    follow_up_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = ImplantFollowUpRepository(db)
    record = await repo.get(follow_up_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Follow-up record not found")
    await repo.delete(record)
    return {"deleted": True}
