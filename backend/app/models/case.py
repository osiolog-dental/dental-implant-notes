from __future__ import annotations

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Case(Base):
    __tablename__ = "cases"
    __table_args__ = (
        sa.Index("ix_cases_patient_id", "patient_id"),
        sa.Index("ix_cases_doctor_id", "doctor_id"),
        sa.Index("ix_cases_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=False
    )
    clinic_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clinics.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="cases")  # noqa: F821
    doctor: Mapped["User"] = relationship("User", back_populates="cases")  # noqa: F821
    clinic: Mapped["Clinic | None"] = relationship("Clinic", back_populates="cases")  # noqa: F821
    images: Mapped[list["CaseImage"]] = relationship("CaseImage", back_populates="case")
    implants: Mapped[list["Implant"]] = relationship("Implant", back_populates="case")  # noqa: F821
    fpd_records: Mapped[list["ProstheticFPD"]] = relationship("ProstheticFPD", back_populates="case")  # noqa: F821


class CaseImage(Base):
    __tablename__ = "case_images"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    # Denormalized from the case's patient for the unauthenticated Drive
    # content proxy (see routes/cases.py drive_image_content) to look up the
    # right org's Drive connection without joining through Case → Patient.
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    # Exactly one of (s3_key) / (drive_file_id) is set, per storage_backend —
    # snapshotted at upload time so switching an org's backend later doesn't
    # orphan images already stored under the old one.
    storage_backend: Mapped[str] = mapped_column(String(20), nullable=False, default="platform")
    s3_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_s3_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    drive_file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    thumbnail_drive_file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="images")
