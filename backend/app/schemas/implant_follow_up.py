from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, field_validator, model_serializer


class ImplantFollowUpBase(BaseModel):
    follow_up_date: date
    osseointegration_success: bool | None = None
    peri_implant_health: str | None = None
    prognosis: str = "Good"
    clinical_notes: str | None = None
    clinic_id: uuid.UUID | None = None

    @field_validator('follow_up_date', mode='before')
    @classmethod
    def _empty_date(cls, v):
        return None if v == '' else v

    @field_validator('clinic_id', mode='before')
    @classmethod
    def _empty_uuid(cls, v):
        return None if v == '' else v

    @field_validator('peri_implant_health', mode='before')
    @classmethod
    def _empty_str(cls, v):
        return None if v == '' else v


class ImplantFollowUpCreate(ImplantFollowUpBase):
    implant_id: uuid.UUID
    patient_id: uuid.UUID


class ImplantFollowUpUpdate(ImplantFollowUpBase):
    follow_up_date: date | None = None  # allow partial updates without re-sending it


class ImplantFollowUpRead(ImplantFollowUpBase):
    id: uuid.UUID
    implant_id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d
