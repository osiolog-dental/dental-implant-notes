"""
Keeps the stock ledger in sync with the implant/abutment record that
consumed one specific InventoryItem, so a doctor never has to revisit the
Stock page after logging what they did to a patient.

Deliberately never blocks: per the user's explicit choice, a clinical record
must always save. Missing or insufficient stock produces a plain-language
warning string for the caller to surface (see ImplantRead.stock_warning /
AbutmentRead.stock_warning) — never an exception, and never a skipped
deduction. The ledger should reflect what was actually used on a patient
even when the stock room's count disagrees with it.

Shared by both implant and abutment routes, and by both create paths that
exist for implants (flat_routes.py and implants.py) — one place, so a stock
rule can't quietly differ depending on which endpoint a client happens to
call.
"""
from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory_item import InventoryItem
from app.models.stock_transaction import StockTransaction
from app.repositories.inventory import InventoryItemRepository


async def _item_label(db: AsyncSession, item_id: uuid.UUID) -> str:
    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        return "the selected stock item"
    bits = [item.brand, item.implant_system or item.abutment_type]
    if item.diameter_mm and item.length_mm:
        bits.append(f"{item.diameter_mm}×{item.length_mm}mm")
    return " ".join(str(b) for b in bits if b) or "the selected stock item"


async def reverse_link(db: AsyncSession, source_type: str, source_id: uuid.UUID) -> None:
    """
    Delete any stock-out transaction previously auto-created for this
    implant/abutment record. Safe to call unconditionally — a no-op if
    nothing was ever linked (e.g. the record never had a stock item picked).
    """
    await db.execute(
        delete(StockTransaction).where(
            StockTransaction.source_type == source_type,
            StockTransaction.source_id == source_id,
        )
    )


async def deduct_for_source(
    db: AsyncSession,
    *,
    inventory_item_id: uuid.UUID,
    patient_id: uuid.UUID,
    source_type: str,
    source_id: uuid.UUID,
    transaction_date: date | None,
) -> str | None:
    """
    Log one unit consumed from inventory_item_id for this implant/abutment.

    Always creates the transaction — even if it takes the count negative —
    because the ledger's job here is to record what was actually used, not
    to gatekeep the save. Returns a warning string when stock is now zero or
    negative; returns None when there is nothing to warn about.
    """
    db.add(StockTransaction(
        id=uuid.uuid4(),
        inventory_item_id=inventory_item_id,
        transaction_type="out",
        quantity=1,
        patient_id=patient_id,
        transaction_date=transaction_date or date.today(),
        source_type=source_type,
        source_id=source_id,
        notes=f"Auto-logged from {source_type} record",
    ))
    await db.flush()

    inv_repo = InventoryItemRepository(db)
    remaining = await inv_repo.get_available_quantity(inventory_item_id)
    if remaining < 0:
        label = await _item_label(db, inventory_item_id)
        return (
            f"Stock for {label} now shows {remaining} — the recorded count is "
            f"lower than what's been logged as used. Check the Stock page."
        )
    if remaining == 0:
        label = await _item_label(db, inventory_item_id)
        return f"That was the last {label} in stock — restock soon."
    return None


async def sync_link(
    db: AsyncSession,
    *,
    before_item_id: uuid.UUID | None,
    after_item_id: uuid.UUID | None,
    patient_id: uuid.UUID,
    source_type: str,
    source_id: uuid.UUID,
    transaction_date: date | None,
) -> str | None:
    """
    Reconciles the stock ledger after an implant/abutment edit that changed
    which stock item is linked. Call only when the picked item actually
    changed (before_item_id != after_item_id) — a caller that always invokes
    this would otherwise reverse-and-recreate the transaction on every
    unrelated edit, losing its original creation timestamp for no reason.
    """
    await reverse_link(db, source_type, source_id)
    if after_item_id is None:
        return None
    return await deduct_for_source(
        db,
        inventory_item_id=after_item_id,
        patient_id=patient_id,
        source_type=source_type,
        source_id=source_id,
        transaction_date=transaction_date,
    )
