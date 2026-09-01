from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, field_validator, model_serializer


class FullMouthRehabBase(BaseModel):
    rehab_type: str = "Upper FMR"
    connected_implant_ids: list[uuid.UUID] = []
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


class FullMouthRehabCreate(FullMouthRehabBase):
    patient_id: uuid.UUID


class FullMouthRehabUpdate(FullMouthRehabBase):
    pass


class FullMouthRehabRead(FullMouthRehabBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d
