from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class PatientBase(BaseModel):
    name: str
    age: int | None = None
    gender: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    alternate_email: str | None = None
    emergency_phone: str | None = None
    address: str | None = None
    medical_history: str | None = None
    tooth_conditions: dict | None = None
    profile_picture: str | None = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    gender: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    alternate_email: str | None = None
    emergency_phone: str | None = None
    address: str | None = None
    medical_history: str | None = None
    tooth_conditions: dict | None = None


class PatientRead(PatientBase):
    id: uuid.UUID
    org_id: uuid.UUID
    doctor_id: uuid.UUID
    deleted_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
