from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


def _blank_to_none(v):
    return None if v == '' else v


class PatientBase(BaseModel):
    name: str
    age: int | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None  # str not EmailStr — avoids 500 on legacy malformed emails in DB
    alternate_email: str | None = None
    emergency_phone: str | None = None
    address: str | None = None
    medical_history: str | None = None
    tooth_conditions: dict | None = None
    profile_picture: str | None = None
    # The clinic this patient belongs to (its my_role decides the finance side shown).
    clinic_id: uuid.UUID | None = None

    _clinic_blank = field_validator('clinic_id', mode='before')(classmethod(lambda cls, v: _blank_to_none(v)))


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
    clinic_id: uuid.UUID | None = None

    _clinic_blank = field_validator('clinic_id', mode='before')(classmethod(lambda cls, v: _blank_to_none(v)))


class PatientRead(PatientBase):
    id: uuid.UUID
    org_id: uuid.UUID
    doctor_id: uuid.UUID
    deleted_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
