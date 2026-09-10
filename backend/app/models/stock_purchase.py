from __future__ import annotations

import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StockPurchase(Base):
    """
    One dealer invoice — e.g. a mixed order of 50 implants/abutments bought
    together for one total. Line items (StockTransaction rows with
    transaction_type='in' and purchase_id set to this row) each carry their
    own quantity and net cost read straight off the invoice, so per-unit
    cost is exact per size rather than averaged across the whole order.
    """
    __tablename__ = "stock_purchases"
    __table_args__ = (sa.Index("ix_stock_purchases_org_id", "org_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    supplier_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    order_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)  # dealer's order/invoice number
    total_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)  # total actually paid, tax-inclusive
    bill_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)  # R2 object key for the invoice photo/PDF
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    lines: Mapped[list["StockTransaction"]] = relationship(  # noqa: F821
        "StockTransaction", back_populates="purchase"
    )
