from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.implant import ImplantRepository
from app.schemas.implant import ImplantCreate, ImplantRead, ImplantUpdate
from app.services.audit import log_event

router = APIRouter(tags=["implants"])


# ── Nested under cases ─────────────────────────────────────────────────────────

@router.get("/cases/{case_id}/implants", response_model=list[ImplantRead])
async def list_implants_by_case(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ImplantRead]:
    repo = ImplantRepository(db)
    implants = await repo.list_by_case(case_id, current_user.org_id)
    return [ImplantRead.model_validate(i) for i in implants]


@router.post("/cases/{case_id}/implants", response_model=ImplantRead, status_code=201)
async def create_implant(
    case_id: uuid.UUID,
    body: ImplantCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImplantRead:
    # Ensure case_id in URL matches body to prevent cross-case writes
    if body.case_id != case_id:
        raise HTTPException(status_code=400, detail="case_id in URL and body must match")
    repo = ImplantRepository(db)
    implant = await repo.create(body)
    await log_event(db, org_id=current_user.org_id, user_id=current_user.id,
                    action="create", entity_type="implant", entity_id=str(implant.id))
    return ImplantRead.model_validate(implant)


# ── By patient (all cases) ─────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/implants", response_model=list[ImplantRead])
async def list_implants_by_patient(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ImplantRead]:
    repo = ImplantRepository(db)
    implants = await repo.list_by_patient(patient_id, current_user.org_id)
    return [ImplantRead.model_validate(i) for i in implants]


# ── Individual implant ─────────────────────────────────────────────────────────

@router.get("/implants/{implant_id}", response_model=ImplantRead)
async def get_implant(
    implant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImplantRead:
    repo = ImplantRepository(db)
    implant = await repo.get(implant_id, current_user.org_id)
    if not implant:
        raise HTTPException(status_code=404, detail="Implant not found")
    return ImplantRead.model_validate(implant)


@router.patch("/implants/{implant_id}", response_model=ImplantRead)
async def update_implant(
    implant_id: uuid.UUID,
    body: ImplantUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImplantRead:
    repo = ImplantRepository(db)
    implant = await repo.get(implant_id, current_user.org_id)
    if not implant:
        raise HTTPException(status_code=404, detail="Implant not found")
    implant = await repo.update(implant, body)
    await log_event(db, org_id=current_user.org_id, user_id=current_user.id,
                    action="update", entity_type="implant", entity_id=str(implant_id))
    return ImplantRead.model_validate(implant)


@router.delete("/implants/{implant_id}")
async def delete_implant(
    implant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = ImplantRepository(db)
    implant = await repo.get(implant_id, current_user.org_id)
    if not implant:
        raise HTTPException(status_code=404, detail="Implant not found")
    await repo.delete(implant)
    await log_event(db, org_id=current_user.org_id, user_id=current_user.id,
                    action="delete", entity_type="implant", entity_id=str(implant_id))
    return {"deleted": True}
