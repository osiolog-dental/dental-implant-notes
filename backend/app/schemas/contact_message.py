from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, field_validator, model_serializer


class ContactMessageCreate(BaseModel):
    name: str | None = None
    email: EmailStr
    subject: str | None = None
    message: str

    @field_validator('name', 'subject', mode='before')
    @classmethod
    def _empty_str(cls, v):
        return None if v == '' else v


class ContactMessageRead(BaseModel):
    id: uuid.UUID
    name: str | None = None
    email: str
    subject: str | None = None
    message: str
    user_id: uuid.UUID | None = None
    email_sent: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d
