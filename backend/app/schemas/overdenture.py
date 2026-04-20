from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, field_validator, model_serializer


class OverdentureBase(BaseModel):
    tooth_numbers: list[int] = []
    attachment_type: str = "Ball Attachment"
    connected_implant_ids: list[uuid.UUID] = []
    has_bar: bool = False
    bar_material: str | None = None
    prosthetic_loading_date: date | None = None
    clinical_notes: str | None = None
    clinic_id: uuid.UUID | None = None

    @field_validator('prosthetic_loading_date', mode='before')
    @classmethod
    def _empty_date(cls, v):
        return None if v == '' else v

    @field_validator('clinic_id', mode='before')
    @classmethod
    def _empty_uuid(cls, v):
        return None if v == '' else v


class OverdentureCreate(OverdentureBase):
    patient_id: uuid.UUID


class OverdentureUpdate(OverdentureBase):
    pass


class OverdentureRead(OverdentureBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d
