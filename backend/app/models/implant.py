from __future__ import annotations

import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Implant(Base):
    __tablename__ = "implants"
    __table_args__ = (
        sa.Index("ix_implants_case_id", "case_id"),
        sa.Index("ix_implants_patient_id", "patient_id"),
        sa.Index("ix_implants_follow_up_date", "follow_up_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )

    # Tooth identification
    tooth_number: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Implant details
    implant_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    length: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    insertion_torque: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    connection_type: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Surgical approach
    surgical_approach: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bone_graft: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sinus_lift_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_pterygoid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_zygomatic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_subperiosteal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Anatomy
    arch: Mapped[str | None] = mapped_column(String(50), nullable=True)
    jaw_region: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Components
    implant_system: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cover_screw: Mapped[str | None] = mapped_column(String(255), nullable=True)
    healing_abutment: Mapped[str | None] = mapped_column(String(255), nullable=True)
    membrane_used: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Diameter / length (friend's frontend uses these names)
    diameter_mm: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    length_mm: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)

    # Measurements & outcomes
    isq_value: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    implant_outcome: Mapped[str | None] = mapped_column(String(100), nullable=True)
    osseointegration_success: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    peri_implant_health: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Dates
    surgery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    follow_up_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    prosthetic_loading_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # People
    surgeon_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    consultant_surgeon: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Notes
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Treatment stage tracking
    current_stage: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    osseointegration_days: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    stage_2_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    stage_3_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Tag / image
    tag_image: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Clinic association
    clinic_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="implants")  # noqa: F821
    patient: Mapped["Patient"] = relationship("Patient", back_populates="implants")  # noqa: F821
