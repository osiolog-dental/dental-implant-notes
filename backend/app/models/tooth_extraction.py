from __future__ import annotations

import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ToothExtraction(Base):
    __tablename__ = "tooth_extractions"
    __table_args__ = (
        sa.Index("ix_tooth_extractions_patient_id", "patient_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    tooth_numbers: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False, default=list)
    extraction_date: Mapped[date] = mapped_column(Date, nullable=False)
    bone_graft: Mapped[str | None] = mapped_column(String(255), nullable=True)
    membrane_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    planned_future_implant: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    reminder_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    clinic_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    clinical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="tooth_extractions")  # noqa: F821
