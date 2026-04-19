from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel


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


class FPDUpdate(FPDBase):
    pass


class FPDRead(FPDBase):
    id: uuid.UUID
    case_id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
