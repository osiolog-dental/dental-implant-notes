from __future__ import annotations

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InventoryItem(Base):
    """
    A distinct implant/abutment/kit product + size the clinic stocks — bought
    in bulk (25/50/100 at a time) rather than per-patient. Available quantity
    is derived from its StockTransaction history, not stored here, so it can
    never drift out of sync with the ledger.

    Implant fields (brand/implant_system/diameter_mm/length_mm) mirror the
    Implant model's own columns; abutment_type reuses the exact vocabulary
    from AbutmentFormModal.js — both so a placed implant/abutment record can
    eventually be matched back to the stock it came from.
    """
    __tablename__ = "inventory_items"
    __table_args__ = (sa.Index("ix_inventory_items_org_id", "org_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="implant")  # implant/abutment/kit/other
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    implant_system: Mapped[str | None] = mapped_column(String(255), nullable=True)  # implants only
    diameter_mm: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)  # implants only
    length_mm: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)    # implants only
    abutment_type: Mapped[str | None] = mapped_column(String(255), nullable=True)    # abutments only
    size_label: Mapped[str | None] = mapped_column(String(255), nullable=True)       # free-text spec (height, kit contents, etc.)
    article_no: Mapped[str | None] = mapped_column(String(100), nullable=True)  # dealer/manufacturer SKU, e.g. "ABT1300"
    low_stock_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinic_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    transactions: Mapped[list["StockTransaction"]] = relationship(  # noqa: F821
        "StockTransaction", back_populates="item", cascade="all, delete-orphan"
    )
