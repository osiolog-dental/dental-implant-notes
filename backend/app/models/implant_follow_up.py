from __future__ import annotations

import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ImplantFollowUp(Base):
    __tablename__ = "implant_follow_ups"
    __table_args__ = (
        sa.Index("ix_implant_follow_ups_patient_id", "patient_id"),
        sa.Index("ix_implant_follow_ups_implant_id", "implant_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    implant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("implants.id", ondelete="CASCADE"), nullable=False
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    follow_up_date: Mapped[date] = mapped_column(Date, nullable=False)
    osseointegration_success: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    peri_implant_health: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prognosis: Mapped[str] = mapped_column(String(20), nullable=False, default="Good")
    clinical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinic_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="implant_follow_ups")  # noqa: F821
    implant: Mapped["Implant"] = relationship("Implant", back_populates="follow_ups")  # noqa: F821
