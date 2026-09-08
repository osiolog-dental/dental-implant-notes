from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, field_validator, model_serializer

CATEGORIES = [
    "implant", "abutment", "crown", "full_mouth_rehab", "overdenture",
    "graft", "membrane", "lab", "consultant", "other",
]


class FinancialLineItemBase(BaseModel):
    category: str = "other"
    description: str | None = None
    provider_type: str = "clinic"  # 'clinic' | 'consultant'
    consultant_charge: float = 0
    material_cost: float = 0
    other_expenses: float = 0  # physiodispenser usage, kit wear & tear, travel, etc.
    cost_amount: float = 0     # authoritative total cost, used by every summary calc
    charged_amount: float = 0
    item_date: date | None = None
    notes: str | None = None
    clinic_id: uuid.UUID | None = None

    @field_validator('item_date', mode='before')
    @classmethod
    def _empty_date(cls, v):
        return None if v == '' else v

    @field_validator('clinic_id', mode='before')
    @classmethod
    def _empty_uuid(cls, v):
        return None if v == '' else v

    @field_validator('cost_amount', 'charged_amount', 'consultant_charge', 'material_cost', 'other_expenses', mode='before')
    @classmethod
    def _empty_number(cls, v):
        return 0 if v in ('', None) else v


class FinancialLineItemCreate(FinancialLineItemBase):
    patient_id: uuid.UUID


class FinancialLineItemUpdate(FinancialLineItemBase):
    pass


class FinancialLineItemRead(FinancialLineItemBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d


class PatientPaymentBase(BaseModel):
    amount: float
    payment_date: date
    method: str | None = None
    notes: str | None = None

    @field_validator('payment_date', mode='before')
    @classmethod
    def _empty_date(cls, v):
        return None if v == '' else v

    @field_validator('method', mode='before')
    @classmethod
    def _empty_str(cls, v):
        return None if v == '' else v


class PatientPaymentCreate(PatientPaymentBase):
    patient_id: uuid.UUID


class PatientPaymentUpdate(PatientPaymentBase):
    amount: float | None = None
    payment_date: date | None = None  # allow partial updates without re-sending it


class PatientPaymentRead(PatientPaymentBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d
