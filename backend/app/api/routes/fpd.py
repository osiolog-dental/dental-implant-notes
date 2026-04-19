from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.fpd import FPDRepository
from app.schemas.fpd import FPDCreate, FPDRead, FPDUpdate

router = APIRouter(tags=["fpd"])


# ── Nested under cases ─────────────────────────────────────────────────────────

@router.get("/cases/{case_id}/fpd", response_model=list[FPDRead])
async def list_fpd_by_case(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FPDRead]:
    repo = FPDRepository(db)
    records = await repo.list_by_case(case_id, current_user.org_id)
    return [FPDRead.model_validate(r) for r in records]


@router.post("/cases/{case_id}/fpd", response_model=FPDRead, status_code=201)
async def create_fpd(
    case_id: uuid.UUID,
    body: FPDCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FPDRead:
    if body.case_id != case_id:
        raise HTTPException(status_code=400, detail="case_id in URL and body must match")
    repo = FPDRepository(db)
    fpd = await repo.create(body)
    return FPDRead.model_validate(fpd)


# ── By patient ─────────────────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/fpd", response_model=list[FPDRead])
async def list_fpd_by_patient(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FPDRead]:
    repo = FPDRepository(db)
    records = await repo.list_by_patient(patient_id, current_user.org_id)
    return [FPDRead.model_validate(r) for r in records]


# ── Individual FPD ─────────────────────────────────────────────────────────────

@router.get("/fpd/{fpd_id}", response_model=FPDRead)
async def get_fpd(
    fpd_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FPDRead:
    repo = FPDRepository(db)
    fpd = await repo.get(fpd_id, current_user.org_id)
    if not fpd:
        raise HTTPException(status_code=404, detail="FPD record not found")
    return FPDRead.model_validate(fpd)


@router.patch("/fpd/{fpd_id}", response_model=FPDRead)
async def update_fpd(
    fpd_id: uuid.UUID,
    body: FPDUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FPDRead:
    repo = FPDRepository(db)
    fpd = await repo.get(fpd_id, current_user.org_id)
    if not fpd:
        raise HTTPException(status_code=404, detail="FPD record not found")
    fpd = await repo.update(fpd, body)
    return FPDRead.model_validate(fpd)


@router.delete("/fpd/{fpd_id}")
async def delete_fpd(
    fpd_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = FPDRepository(db)
    fpd = await repo.get(fpd_id, current_user.org_id)
    if not fpd:
        raise HTTPException(status_code=404, detail="FPD record not found")
    await repo.delete(fpd)
    return {"deleted": True}
