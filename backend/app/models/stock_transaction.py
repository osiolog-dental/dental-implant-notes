from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StockTransaction(Base):
    """
    One stock-in or stock-out ledger entry for an InventoryItem.

    Stock-in ('in'): quantity + net cost for this specific size, either read
    off one line of a StockPurchase invoice (purchase_id set — per-unit cost
    is that purchase line's net cost / quantity) or a quick standalone
    restock with its own unit_cost (purchase_id null).

    Stock-out ('out'): quantity used, optionally linked to the patient it
    was used on for traceability.
    """
    __tablename__ = "stock_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    inventory_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False
    )
    transaction_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'in' | 'out'
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)  # standalone stock-in only
    purchase_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stock_purchases.id", ondelete="CASCADE"), nullable=True
    )
    line_net_cost: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)  # this line's net cost, from the invoice
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="SET NULL"), nullable=True
    )
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    item: Mapped["InventoryItem"] = relationship("InventoryItem", back_populates="transactions")
    purchase: Mapped["StockPurchase | None"] = relationship("StockPurchase", back_populates="lines")
