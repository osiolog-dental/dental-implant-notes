from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, field_validator, model_serializer


class ToothExtractionBase(BaseModel):
    tooth_numbers: list[int] = []
    extraction_date: date
    bone_graft: str | None = None
    membrane_used: bool = False
    planned_future_implant: bool = False
    reminder_days: int | None = None
    clinic_id: uuid.UUID | None = None
    clinical_notes: str | None = None

    @field_validator('extraction_date', mode='before')
    @classmethod
    def _empty_date(cls, v):
        return None if v == '' else v

    @field_validator('clinic_id', mode='before')
    @classmethod
    def _empty_uuid(cls, v):
        return None if v == '' else v

    @field_validator('reminder_days', mode='before')
    @classmethod
    def _empty_int(cls, v):
        return None if v == '' else v


class ToothExtractionCreate(ToothExtractionBase):
    patient_id: uuid.UUID


class ToothExtractionUpdate(ToothExtractionBase):
    extraction_date: date | None = None  # allow partial updates without re-sending it


class ToothExtractionRead(ToothExtractionBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d
