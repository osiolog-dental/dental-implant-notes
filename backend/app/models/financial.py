from __future__ import annotations

import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FinancialLineItem(Base):
    """
    A single cost/charge line for a patient — one implant, abutment, crown,
    graft, membrane, lab bill, or consultant fee. Cost and charged amounts
    are entered per-instance (not looked up from a fixed price list) since
    real prices vary case to case from bargaining or a change of brand.
    """
    __tablename__ = "financial_line_items"
    __table_args__ = (
        sa.Index("ix_financial_line_items_patient_id", "patient_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # implant/abutment/crown/full_mouth_rehab/overdenture/graft/membrane/lab/consultant/other
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # provider_type + the three fields below break down cost_amount for
    # transparency; cost_amount itself stays the authoritative total used by
    # every profit/summary calculation, so nothing else has to know they exist.
    provider_type: Mapped[str] = mapped_column(String(20), nullable=False, default="clinic")  # 'clinic' | 'consultant'
    consultant_charge: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    material_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    other_expenses: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)  # physiodispenser usage, kit wear & tear, travel, etc.
    cost_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    charged_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    item_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinic_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="financial_line_items")  # noqa: F821


class PatientPayment(Base):
    """A payment received from a patient, on a given date."""
    __tablename__ = "patient_payments"
    __table_args__ = (
        sa.Index("ix_patient_payments_patient_id", "patient_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Cash/Card/UPI/Bank Transfer/Other
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="payments")  # noqa: F821
