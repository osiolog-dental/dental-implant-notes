from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: str | None = None
    country: str | None = None
    registration_number: str | None = None
    college: str | None = None
    college_place: str | None = None
    bio: str | None = None
    specialization: str | None = None
    place: str | None = None


class UserCreate(UserBase):
    firebase_uid: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    country: str | None = None
    registration_number: str | None = None
    college: str | None = None
    college_place: str | None = None
    bio: str | None = None
    specialization: str | None = None
    place: str | None = None
    profile_picture_key: str | None = None
    gender: str | None = None
    date_of_birth: str | None = None
    designation: str | None = None
    organization_name: str | None = None
    years_of_experience: int | None = None
    address_street: str | None = None
    address_city: str | None = None
    address_state: str | None = None
    address_zip: str | None = None
    primary_clinic: str | None = None
    consulting_clinics: str | None = None
    clinical_focus: str | None = None
    education: list | None = None
    publications: list | None = None


class UserRead(UserBase):
    id: uuid.UUID
    org_id: uuid.UUID
    firebase_uid: str | None
    profile_picture_key: str | None
    profile_picture: str | None = None
    created_at: datetime
    gender: str | None = None
    date_of_birth: str | None = None
    designation: str | None = None
    organization_name: str | None = None
    years_of_experience: int | None = None
    address_street: str | None = None
    address_city: str | None = None
    address_state: str | None = None
    address_zip: str | None = None
    primary_clinic: str | None = None
    consulting_clinics: str | None = None
    clinical_focus: str | None = None
    education: list | None = None
    publications: list | None = None

    model_config = {"from_attributes": True}
