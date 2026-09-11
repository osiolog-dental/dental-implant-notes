from __future__ import annotations

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CatalogueReference(Base):
    """
    A permanent article-number → component mapping learned from a supplier
    catalogue upload — e.g. "ABT1300" always means "Alpha Bio Tech Spiral
    D3.3mm L10.0mm". Reused across every future purchase so re-ordering a
    known size never requires re-scanning the catalogue. One row per
    (org, article_no); re-scanning the same article number overwrites it.
    """
    __tablename__ = "catalogue_references"
    __table_args__ = (
        sa.UniqueConstraint("org_id", "article_no", name="uq_catalogue_reference_org_article"),
        sa.Index("ix_catalogue_references_org_id", "org_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    article_no: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="implant")
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    implant_system: Mapped[str | None] = mapped_column(String(255), nullable=True)
    diameter_mm: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    length_mm: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    abutment_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    size_label: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
