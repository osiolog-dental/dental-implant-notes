from __future__ import annotations

import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.patient import Patient
from app.models.user import User
from app.repositories.financial import FinancialLineItemRepository, PatientPaymentRepository
from app.services.finance_sides import finance_summary, resolve_sides
from app.schemas.financial import (
    FinancialLineItemCreate, FinancialLineItemRead, FinancialLineItemUpdate,
    PatientPaymentCreate, PatientPaymentRead, PatientPaymentUpdate,
)

router = APIRouter(tags=["financials"])


async def _require_own_patient(db: AsyncSession, patient_id: uuid.UUID, org_id: uuid.UUID) -> None:
    """A cost line or payment may only be added to a patient in the caller's own practice."""
    found = (await db.execute(
        select(Patient.id).where(Patient.id == patient_id, Patient.org_id == org_id, Patient.deleted_at.is_(None))
    )).scalar_one_or_none()
    if found is None:
        raise HTTPException(status_code=404, detail="Patient not found")


# ── Line items (cost/charge per implant, abutment, crown, lab, consultant, etc.) ──

@router.get("/financial-line-items", response_model=list[FinancialLineItemRead])
async def list_financial_line_items(
    patient_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FinancialLineItemRead]:
    repo = FinancialLineItemRepository(db)
    records = await repo.list_by_patient(patient_id, current_user.org_id)
    # Attach which side each line belongs to (own clinic vs own consulting work) —
    # the same rule the Analytics summary uses. See services/finance_sides.py.
    resolved = await resolve_sides(db, current_user.org_id, records)
    out = []
    for r in records:
        item = FinancialLineItemRead.model_validate(r)
        item.finance_side = resolved[r.id].side
        item.resolved_clinic_id = resolved[r.id].clinic_id
        out.append(item)
    return out


@router.get("/analytics/finance-summary")
async def analytics_finance_summary(
    period: Literal['month', 'year', 'all'] = Query('month'),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Practice-wide finances from real cost lines and payments, split into
    clinic-owner and own-consulting sides, with a per-clinic breakdown."""
    return await finance_summary(db, current_user.org_id, period, date.today())


@router.post("/financial-line-items", response_model=FinancialLineItemRead, status_code=201)
async def create_financial_line_item(
    body: FinancialLineItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FinancialLineItemRead:
    await _require_own_patient(db, body.patient_id, current_user.org_id)
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
    await _require_own_patient(db, body.patient_id, current_user.org_id)
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
