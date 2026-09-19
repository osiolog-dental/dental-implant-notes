from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.implant import ImplantRepository
from app.schemas.implant import ImplantCreate, ImplantRead, ImplantUpdate
from app.services import stock_linking
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

    stock_warning = None
    if implant.inventory_item_id:
        stock_warning = await stock_linking.deduct_for_source(
            db, inventory_item_id=implant.inventory_item_id, patient_id=implant.patient_id,
            source_type="implant", source_id=implant.id, transaction_date=implant.surgery_date,
        )

    await log_event(db, org_id=current_user.org_id, user_id=current_user.id,
                    action="create", entity_type="implant", entity_id=str(implant.id))
    resp = ImplantRead.model_validate(implant)
    resp.stock_warning = stock_warning
    return resp


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

    before_item_id = implant.inventory_item_id
    implant = await repo.update(implant, body)

    stock_warning = None
    if "inventory_item_id" in body.model_fields_set and implant.inventory_item_id != before_item_id:
        stock_warning = await stock_linking.sync_link(
            db, before_item_id=before_item_id, after_item_id=implant.inventory_item_id,
            patient_id=implant.patient_id, source_type="implant", source_id=implant.id,
            transaction_date=implant.surgery_date,
        )

    await log_event(db, org_id=current_user.org_id, user_id=current_user.id,
                    action="update", entity_type="implant", entity_id=str(implant_id))
    resp = ImplantRead.model_validate(implant)
    resp.stock_warning = stock_warning
    return resp


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
    await stock_linking.reverse_link(db, "implant", implant.id)
    await repo.delete(implant)
    await log_event(db, org_id=current_user.org_id, user_id=current_user.id,
                    action="delete", entity_type="implant", entity_id=str(implant_id))
    return {"deleted": True}
