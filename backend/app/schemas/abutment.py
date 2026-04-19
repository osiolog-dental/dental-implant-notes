from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, model_serializer


class AbutmentBase(BaseModel):
    tooth_number: int | None = None
    abutment_type: str = "Stock Abutment Straight"
    connected_implant_ids: list[uuid.UUID] = []
    placement_date: date | None = None
    clinical_notes: str | None = None
    clinic_id: uuid.UUID | None = None


class AbutmentCreate(AbutmentBase):
    patient_id: uuid.UUID


class AbutmentUpdate(AbutmentBase):
    pass


class AbutmentRead(AbutmentBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d
