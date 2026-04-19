from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, model_serializer


class ImplantBase(BaseModel):
    tooth_number: int | None = None
    implant_type: str | None = None
    brand: str | None = None
    size: str | None = None
    length: float | None = None
    diameter_mm: float | None = None
    length_mm: float | None = None
    insertion_torque: float | None = None
    connection_type: str | None = None
    surgical_approach: str | None = None
    bone_graft: str | None = None
    sinus_lift_type: str | None = None
    is_pterygoid: bool = False
    is_zygomatic: bool = False
    is_subperiosteal: bool = False
    arch: str | None = None
    jaw_region: str | None = None
    implant_system: str | None = None
    cover_screw: str | None = None
    healing_abutment: str | None = None
    membrane_used: str | None = None
    isq_value: float | None = None
    follow_up_date: date | None = None
    surgeon_name: str | None = None
    consultant_surgeon: str | None = None
    surgery_date: date | None = None
    prosthetic_loading_date: date | None = None
    implant_outcome: str | None = None
    osseointegration_success: bool | None = None
    peri_implant_health: str | None = None
    notes: str | None = None
    clinical_notes: str | None = None
    tag_image: str | None = None
    clinic_id: str | None = None


class ImplantCreate(ImplantBase):
    case_id: uuid.UUID
    patient_id: uuid.UUID


class ImplantFlatCreate(ImplantBase):
    """Used by flat /api/implants endpoint — case_id not required."""
    patient_id: uuid.UUID


class ImplantUpdate(ImplantBase):
    pass


class ImplantRead(ImplantBase):
    id: uuid.UUID
    case_id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d
