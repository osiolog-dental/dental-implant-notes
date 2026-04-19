from __future__ import annotations

import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProstheticFPD(Base):
    __tablename__ = "prosthetic_fpd"
    __table_args__ = (
        sa.Index("ix_fpd_case_id", "case_id"),
        sa.Index("ix_fpd_patient_id", "patient_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )

    tooth_numbers: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False, default=list)
    prosthetic_loading_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    crown_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    connected_implant_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=False, default=list
    )
    crown_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    material: Mapped[str | None] = mapped_column(String(255), nullable=True)
    clinical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="fpd_records")  # noqa: F821
    patient: Mapped["Patient"] = relationship("Patient", back_populates="fpd_records")  # noqa: F821
