from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, model_serializer


class FPDBase(BaseModel):
    tooth_numbers: list[int] = []
    prosthetic_loading_date: date | None = None
    crown_count: int | None = None
    connected_implant_ids: list[uuid.UUID] = []
    crown_type: str | None = None
    material: str | None = None
    clinical_notes: str | None = None


class FPDCreate(FPDBase):
    case_id: uuid.UUID
    patient_id: uuid.UUID


class FPDFlatCreate(FPDBase):
    """Used by the flat /api/fpd-records endpoint — no case_id required."""
    patient_id: uuid.UUID
    consultant_prosthodontist: str | None = None
    lab_name: str | None = None
    crown_material: str | None = None


class FPDUpdate(FPDBase):
    consultant_prosthodontist: str | None = None
    lab_name: str | None = None
    crown_material: str | None = None


class FPDRead(FPDBase):
    id: uuid.UUID
    case_id: uuid.UUID | None = None
    patient_id: uuid.UUID
    consultant_prosthodontist: str | None = None
    lab_name: str | None = None
    crown_material: str | None = None
    warranty_image_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d
