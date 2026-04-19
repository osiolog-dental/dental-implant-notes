from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.clinic import ClinicRepository
from app.schemas.clinic import ClinicCreate, ClinicRead, ClinicUpdate

router = APIRouter(prefix="/clinics", tags=["clinics"])


@router.get("", response_model=list[ClinicRead])
async def list_clinics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ClinicRead]:
    repo = ClinicRepository(db)
    clinics = await repo.list(current_user.org_id)
    return [ClinicRead.model_validate(c) for c in clinics]


@router.post("", response_model=ClinicRead, status_code=status.HTTP_201_CREATED)
async def create_clinic(
    body: ClinicCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClinicRead:
    repo = ClinicRepository(db)
    clinic = await repo.create(current_user.org_id, body)
    return ClinicRead.model_validate(clinic)


@router.get("/{clinic_id}", response_model=ClinicRead)
async def get_clinic(
    clinic_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClinicRead:
    repo = ClinicRepository(db)
    clinic = await repo.get(clinic_id, current_user.org_id)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return ClinicRead.model_validate(clinic)


@router.patch("/{clinic_id}", response_model=ClinicRead)
async def update_clinic(
    clinic_id: uuid.UUID,
    body: ClinicUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClinicRead:
    repo = ClinicRepository(db)
    clinic = await repo.get(clinic_id, current_user.org_id)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    clinic = await repo.update(clinic, body)
    return ClinicRead.model_validate(clinic)


@router.delete("/{clinic_id}", status_code=status.HTTP_200_OK)
async def delete_clinic(  # type: ignore[return]
    clinic_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = ClinicRepository(db)
    clinic = await repo.get(clinic_id, current_user.org_id)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    await repo.delete(clinic)
    return {"deleted": True}
