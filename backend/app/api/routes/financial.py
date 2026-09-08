from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.financial import FinancialLineItemRepository, PatientPaymentRepository
from app.schemas.financial import (
    FinancialLineItemCreate, FinancialLineItemRead, FinancialLineItemUpdate,
    PatientPaymentCreate, PatientPaymentRead, PatientPaymentUpdate,
)

router = APIRouter(tags=["financials"])


# ── Line items (cost/charge per implant, abutment, crown, lab, consultant, etc.) ──

@router.get("/financial-line-items", response_model=list[FinancialLineItemRead])
async def list_financial_line_items(
    patient_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FinancialLineItemRead]:
    repo = FinancialLineItemRepository(db)
    records = await repo.list_by_patient(patient_id, current_user.org_id)
    return [FinancialLineItemRead.model_validate(r) for r in records]


@router.post("/financial-line-items", response_model=FinancialLineItemRead, status_code=201)
async def create_financial_line_item(
    body: FinancialLineItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FinancialLineItemRead:
    repo = FinancialLineItemRepository(db)
    record = await repo.create(body)
    return FinancialLineItemRead.model_validate(record)


@router.patch("/financial-line-items/{item_id}", response_model=FinancialLineItemRead)
async def update_financial_line_item(
    item_id: uuid.UUID,
    body: FinancialLineItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FinancialLineItemRead:
    repo = FinancialLineItemRepository(db)
    record = await repo.get(item_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Financial line item not found")
    record = await repo.update(record, body)
    return FinancialLineItemRead.model_validate(record)


@router.delete("/financial-line-items/{item_id}")
async def delete_financial_line_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = FinancialLineItemRepository(db)
    record = await repo.get(item_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Financial line item not found")
    await repo.delete(record)
    return {"deleted": True}


# ── Payments received from the patient ────────────────────────────────────────

@router.get("/patient-payments", response_model=list[PatientPaymentRead])
async def list_patient_payments(
    patient_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PatientPaymentRead]:
    repo = PatientPaymentRepository(db)
    records = await repo.list_by_patient(patient_id, current_user.org_id)
    return [PatientPaymentRead.model_validate(r) for r in records]


@router.post("/patient-payments", response_model=PatientPaymentRead, status_code=201)
async def create_patient_payment(
    body: PatientPaymentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PatientPaymentRead:
    repo = PatientPaymentRepository(db)
    record = await repo.create(body)
    return PatientPaymentRead.model_validate(record)


@router.patch("/patient-payments/{payment_id}", response_model=PatientPaymentRead)
async def update_patient_payment(
    payment_id: uuid.UUID,
    body: PatientPaymentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PatientPaymentRead:
    repo = PatientPaymentRepository(db)
    record = await repo.get(payment_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Payment not found")
    record = await repo.update(record, body)
    return PatientPaymentRead.model_validate(record)


@router.delete("/patient-payments/{payment_id}")
async def delete_patient_payment(
    payment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = PatientPaymentRepository(db)
    record = await repo.get(payment_id, current_user.org_id)
    if not record:
        raise HTTPException(status_code=404, detail="Payment not found")
    await repo.delete(record)
    return {"deleted": True}
