from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Set by hand from the admin panel for now — there's no self-serve
    # checkout yet, so a plan change is always the admin acting on a payment
    # that happened outside the app.
    plan: Mapped[str] = mapped_column(String(20), nullable=False, default="free")
    plan_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    plan_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Extra clinic slots purchased on top of the plan's base clinic limit
    # (see app.core.plans.CLINIC_ADDON_OPTIONS) — also admin-set by hand.
    extra_clinics: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="organization")  # noqa: F821
    clinics: Mapped[list["Clinic"]] = relationship("Clinic", back_populates="organization")  # noqa: F821
    patients: Mapped[list["Patient"]] = relationship("Patient", back_populates="organization")  # noqa: F821
    invites: Mapped[list["Invite"]] = relationship("Invite", back_populates="organization")  # noqa: F821
    audit_events: Mapped[list["AuditEvent"]] = relationship("AuditEvent", back_populates="organization")  # noqa: F821
