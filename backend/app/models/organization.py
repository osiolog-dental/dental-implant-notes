from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="organization")  # noqa: F821
    clinics: Mapped[list["Clinic"]] = relationship("Clinic", back_populates="organization")  # noqa: F821
    patients: Mapped[list["Patient"]] = relationship("Patient", back_populates="organization")  # noqa: F821
    invites: Mapped[list["Invite"]] = relationship("Invite", back_populates="organization")  # noqa: F821
    audit_events: Mapped[list["AuditEvent"]] = relationship("AuditEvent", back_populates="organization")  # noqa: F821
