from __future__ import annotations

import uuid

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory_item import InventoryItem
from app.models.stock_purchase import StockPurchase
from app.models.stock_transaction import StockTransaction
from app.schemas.inventory import (
    InventoryItemCreate, InventoryItemUpdate,
    StockPurchaseCreate, StockPurchaseUpdate,
    StockTransactionCreate,
)

# Net units for a transaction: +quantity for stock-in, -quantity for stock-out.
_SIGNED_QTY = case((StockTransaction.transaction_type == "in", StockTransaction.quantity), else_=-StockTransaction.quantity)


class InventoryItemRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_with_stock(self, org_id: uuid.UUID) -> list[tuple[InventoryItem, int]]:
        stock_subq = (
            select(
                StockTransaction.inventory_item_id.label("item_id"),
                func.coalesce(func.sum(_SIGNED_QTY), 0).label("available_quantity"),
            )
            .group_by(StockTransaction.inventory_item_id)
            .subquery()
        )
        result = await self.db.execute(
            select(InventoryItem, func.coalesce(stock_subq.c.available_quantity, 0))
            .outerjoin(stock_subq, InventoryItem.id == stock_subq.c.item_id)
            .where(InventoryItem.org_id == org_id)
            .order_by(InventoryItem.category, InventoryItem.brand, InventoryItem.created_at.desc())
        )
        return [(item, int(qty)) for item, qty in result.all()]

    async def get(self, item_id: uuid.UUID, org_id: uuid.UUID) -> InventoryItem | None:
        result = await self.db.execute(
            select(InventoryItem).where(InventoryItem.id == item_id, InventoryItem.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def get_available_quantity(self, item_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.coalesce(func.sum(_SIGNED_QTY), 0)).where(StockTransaction.inventory_item_id == item_id)
        )
        return int(result.scalar_one())

    async def create(self, org_id: uuid.UUID, data: InventoryItemCreate) -> InventoryItem:
        item = InventoryItem(id=uuid.uuid4(), org_id=org_id, **data.model_dump())
        self.db.add(item)
        await self.db.flush()
        return item

    async def update(self, item: InventoryItem, data: InventoryItemUpdate) -> InventoryItem:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        self.db.add(item)
        await self.db.flush()
        return item

    async def delete(self, item: InventoryItem) -> None:
        await self.db.delete(item)
        await self.db.flush()


class StockPurchaseRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(self, org_id: uuid.UUID) -> list[StockPurchase]:
        result = await self.db.execute(
            select(StockPurchase)
            .where(StockPurchase.org_id == org_id)
            .order_by(StockPurchase.purchase_date.desc(), StockPurchase.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, purchase_id: uuid.UUID, org_id: uuid.UUID) -> StockPurchase | None:
        result = await self.db.execute(
            select(StockPurchase).where(StockPurchase.id == purchase_id, StockPurchase.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def create(self, org_id: uuid.UUID, data: StockPurchaseCreate) -> StockPurchase:
        purchase = StockPurchase(id=uuid.uuid4(), org_id=org_id, **data.model_dump())
        self.db.add(purchase)
        await self.db.flush()
        return purchase

    async def update(self, purchase: StockPurchase, data: StockPurchaseUpdate) -> StockPurchase:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(purchase, field, value)
        self.db.add(purchase)
        await self.db.flush()
        return purchase

    async def delete(self, purchase: StockPurchase) -> None:
        await self.db.delete(purchase)
        await self.db.flush()


class StockTransactionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_item(self, inventory_item_id: uuid.UUID) -> list[StockTransaction]:
        result = await self.db.execute(
            select(StockTransaction)
            .where(StockTransaction.inventory_item_id == inventory_item_id)
            .order_by(StockTransaction.transaction_date.desc(), StockTransaction.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_by_purchase(self, purchase_id: uuid.UUID) -> list[StockTransaction]:
        result = await self.db.execute(
            select(StockTransaction)
            .where(StockTransaction.purchase_id == purchase_id)
            .order_by(StockTransaction.created_at.asc())
        )
        return list(result.scalars().all())

    async def get(self, transaction_id: uuid.UUID) -> StockTransaction | None:
        result = await self.db.execute(
            select(StockTransaction).where(StockTransaction.id == transaction_id)
        )
        return result.scalar_one_or_none()

    async def create(self, inventory_item_id: uuid.UUID, data: StockTransactionCreate) -> StockTransaction:
        txn = StockTransaction(id=uuid.uuid4(), inventory_item_id=inventory_item_id, **data.model_dump())
        self.db.add(txn)
        await self.db.flush()
        return txn

    async def delete(self, txn: StockTransaction) -> None:
        await self.db.delete(txn)
        await self.db.flush()
