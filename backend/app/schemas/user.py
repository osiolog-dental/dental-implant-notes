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


class UserRead(UserBase):
    id: uuid.UUID
    org_id: uuid.UUID
    firebase_uid: str | None
    profile_picture_key: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
