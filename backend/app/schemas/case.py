from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class CaseBase(BaseModel):
    title: str
    status: str = "active"
    notes: str | None = None
    clinic_id: uuid.UUID | None = None


class CaseCreate(CaseBase):
    patient_id: uuid.UUID


class CaseUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    notes: str | None = None
    clinic_id: uuid.UUID | None = None


class CaseRead(CaseBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class CaseImageRead(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    content_type: str
    category: str
    status: str
    uploaded_at: datetime
    url: str                      # presigned GET URL for full image
    thumbnail_url: str | None     # presigned GET URL for thumbnail (None for PDFs)

    model_config = {"from_attributes": True}
