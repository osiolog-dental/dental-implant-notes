from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class ClinicBase(BaseModel):
    name: str
    address: str | None = None


class ClinicCreate(ClinicBase):
    pass


class ClinicUpdate(BaseModel):
    name: str | None = None
    address: str | None = None


class ClinicRead(ClinicBase):
    id: uuid.UUID
    org_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
