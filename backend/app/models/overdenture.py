from __future__ import annotations

import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Overdenture(Base):
    __tablename__ = "overdentures"
    __table_args__ = (
        sa.Index("ix_overdentures_patient_id", "patient_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    tooth_numbers: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False, default=list)
    attachment_type: Mapped[str] = mapped_column(String(255), nullable=False, default="Ball Attachment")
    connected_implant_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=False, default=list
    )
    has_bar: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    bar_material: Mapped[str | None] = mapped_column(String(255), nullable=True)
    prosthetic_loading_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    clinical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinic_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="overdentures")  # noqa: F821
