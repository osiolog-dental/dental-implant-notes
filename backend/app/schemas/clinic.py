from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class ClinicBase(BaseModel):
    name: str
    address: str | None = None
    phone: str | None = None
    alternate_phone: str | None = None
    email: str | None = None
    gmaps_link: str | None = None
    latitude: float | None = None
    longitude: float | None = None

    @field_validator('address', 'phone', 'alternate_phone', 'email', 'gmaps_link', mode='before')
    @classmethod
    def _empty_str(cls, v):
        return None if v == '' else v

    @field_validator('latitude', 'longitude', mode='before')
    @classmethod
    def _empty_number(cls, v):
        return None if v in ('', None) else v


class ClinicCreate(ClinicBase):
    pass


class ClinicUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    alternate_phone: str | None = None
    email: str | None = None
    gmaps_link: str | None = None
    latitude: float | None = None
    longitude: float | None = None

    @field_validator('address', 'phone', 'alternate_phone', 'email', 'gmaps_link', mode='before')
    @classmethod
    def _empty_str(cls, v):
        return None if v == '' else v

    @field_validator('latitude', 'longitude', mode='before')
    @classmethod
    def _empty_number(cls, v):
        return None if v in ('', None) else v


class ClinicRead(ClinicBase):
    id: uuid.UUID
    org_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ResolveMapsLinkRequest(BaseModel):
    url: str


class ResolveMapsLinkResponse(BaseModel):
    name: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    resolved_url: str | None = None
