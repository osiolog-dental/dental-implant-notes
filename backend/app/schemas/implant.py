from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, field_validator, model_serializer


def _empty_to_none_float(v: Any) -> Any:
    if v == "" or v is False:
        return None
    return v


def _empty_to_none_date(v: Any) -> Any:
    if v == "" or v is False:
        return None
    return v


def _bool_to_none_str(v: Any) -> Any:
    if isinstance(v, bool):
        return None
    return v


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
    cover_screw: bool | None = None
    healing_abutment: bool | None = None
    membrane_used: bool | None = None
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
    current_stage: int | None = None
    osseointegration_days: int | None = None
    stage_2_date: date | None = None
    stage_3_date: date | None = None

    @field_validator("diameter_mm", "length_mm", "insertion_torque", "isq_value", "length", mode="before")
    @classmethod
    def coerce_float(cls, v: Any) -> Any:
        return _empty_to_none_float(v)

    @field_validator("follow_up_date", "surgery_date", "prosthetic_loading_date", "stage_2_date", "stage_3_date", mode="before")
    @classmethod
    def coerce_date(cls, v: Any) -> Any:
        return _empty_to_none_date(v)

    @field_validator("peri_implant_health", mode="before")
    @classmethod
    def coerce_peri_health(cls, v: Any) -> Any:
        return _bool_to_none_str(v)


class ImplantCreate(ImplantBase):
    case_id: uuid.UUID | None = None
    patient_id: uuid.UUID


class ImplantFlatCreate(ImplantBase):
    """Used by flat /api/implants endpoint — case_id not required."""
    patient_id: uuid.UUID


class ImplantUpdate(ImplantBase):
    pass


class ImplantRead(ImplantBase):
    id: uuid.UUID
    case_id: uuid.UUID | None = None
    patient_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d
