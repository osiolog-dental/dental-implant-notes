from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.financial import FinancialLineItem, PatientPayment
from app.models.patient import Patient
from app.schemas.financial import (
    FinancialLineItemCreate, FinancialLineItemUpdate,
    PatientPaymentCreate, PatientPaymentUpdate,
)


class FinancialLineItemRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_patient(self, patient_id: uuid.UUID, org_id: uuid.UUID) -> list[FinancialLineItem]:
        result = await self.db.execute(
            select(FinancialLineItem)
            .join(Patient, FinancialLineItem.patient_id == Patient.id)
            .where(
                FinancialLineItem.patient_id == patient_id,
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
            .order_by(FinancialLineItem.item_date.desc(), FinancialLineItem.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, item_id: uuid.UUID, org_id: uuid.UUID) -> FinancialLineItem | None:
        result = await self.db.execute(
            select(FinancialLineItem)
            .join(Patient, FinancialLineItem.patient_id == Patient.id)
            .where(FinancialLineItem.id == item_id, Patient.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: FinancialLineItemCreate) -> FinancialLineItem:
        item = FinancialLineItem(id=uuid.uuid4(), **data.model_dump())
        self.db.add(item)
        await self.db.flush()
        return item

    async def update(self, item: FinancialLineItem, data: FinancialLineItemUpdate) -> FinancialLineItem:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        self.db.add(item)
        await self.db.flush()
        return item

    async def delete(self, item: FinancialLineItem) -> None:
        await self.db.delete(item)
        await self.db.flush()


class PatientPaymentRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_patient(self, patient_id: uuid.UUID, org_id: uuid.UUID) -> list[PatientPayment]:
        result = await self.db.execute(
            select(PatientPayment)
            .join(Patient, PatientPayment.patient_id == Patient.id)
            .where(
                PatientPayment.patient_id == patient_id,
                Patient.org_id == org_id,
                Patient.deleted_at.is_(None),
            )
            .order_by(PatientPayment.payment_date.desc(), PatientPayment.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, payment_id: uuid.UUID, org_id: uuid.UUID) -> PatientPayment | None:
        result = await self.db.execute(
            select(PatientPayment)
            .join(Patient, PatientPayment.patient_id == Patient.id)
            .where(PatientPayment.id == payment_id, Patient.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: PatientPaymentCreate) -> PatientPayment:
        payment = PatientPayment(id=uuid.uuid4(), **data.model_dump())
        self.db.add(payment)
        await self.db.flush()
        return payment

    async def update(self, payment: PatientPayment, data: PatientPaymentUpdate) -> PatientPayment:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(payment, field, value)
        self.db.add(payment)
        await self.db.flush()
        return payment

    async def delete(self, payment: PatientPayment) -> None:
        await self.db.delete(payment)
        await self.db.flush()
