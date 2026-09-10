from __future__ import annotations

import asyncio
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.inventory import (
    InventoryItemRepository, StockPurchaseRepository, StockTransactionRepository,
)
from app.schemas.inventory import (
    InventoryItemCreate, InventoryItemRead, InventoryItemUpdate,
    StockPurchaseCreate, StockPurchaseRead, StockPurchaseUpdate,
    StockTransactionCreate, StockTransactionRead,
)
from app.services import s3 as s3_service

router = APIRouter(tags=["inventory"])


# ── Inventory items (distinct implant/abutment/kit + size a clinic stocks) ──

@router.get("/inventory-items", response_model=list[InventoryItemRead])
async def list_inventory_items(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[InventoryItemRead]:
    repo = InventoryItemRepository(db)
    rows = await repo.list_with_stock(current_user.org_id)
    return [
        InventoryItemRead.model_validate(item).model_copy(update={"available_quantity": qty})
        for item, qty in rows
    ]


@router.post("/inventory-items", response_model=InventoryItemRead, status_code=201)
async def create_inventory_item(
    body: InventoryItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InventoryItemRead:
    repo = InventoryItemRepository(db)
    item = await repo.create(current_user.org_id, body)
    return InventoryItemRead.model_validate(item).model_copy(update={"available_quantity": 0})


@router.patch("/inventory-items/{item_id}", response_model=InventoryItemRead)
async def update_inventory_item(
    item_id: uuid.UUID,
    body: InventoryItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InventoryItemRead:
    repo = InventoryItemRepository(db)
    item = await repo.get(item_id, current_user.org_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    item = await repo.update(item, body)
    qty = await repo.get_available_quantity(item.id)
    return InventoryItemRead.model_validate(item).model_copy(update={"available_quantity": qty})


@router.delete("/inventory-items/{item_id}")
async def delete_inventory_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = InventoryItemRepository(db)
    item = await repo.get(item_id, current_user.org_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    await repo.delete(item)
    return {"deleted": True}


# ── Stock transactions (stock-in / stock-out ledger for one item) ──────────

@router.get("/inventory-items/{item_id}/transactions", response_model=list[StockTransactionRead])
async def list_item_transactions(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[StockTransactionRead]:
    item_repo = InventoryItemRepository(db)
    item = await item_repo.get(item_id, current_user.org_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    txn_repo = StockTransactionRepository(db)
    records = await txn_repo.list_by_item(item_id)
    return [StockTransactionRead.model_validate(r) for r in records]


@router.post("/inventory-items/{item_id}/transactions", response_model=StockTransactionRead, status_code=201)
async def create_item_transaction(
    item_id: uuid.UUID,
    body: StockTransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StockTransactionRead:
    item_repo = InventoryItemRepository(db)
    item = await item_repo.get(item_id, current_user.org_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if body.purchase_id:
        purchase_repo = StockPurchaseRepository(db)
        purchase = await purchase_repo.get(body.purchase_id, current_user.org_id)
        if not purchase:
            raise HTTPException(status_code=404, detail="Purchase not found")

    txn_repo = StockTransactionRepository(db)
    txn = await txn_repo.create(item_id, body)
    return StockTransactionRead.model_validate(txn)


@router.delete("/stock-transactions/{transaction_id}")
async def delete_stock_transaction(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    txn_repo = StockTransactionRepository(db)
    txn = await txn_repo.get(transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    item_repo = InventoryItemRepository(db)
    item = await item_repo.get(txn.inventory_item_id, current_user.org_id)
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await txn_repo.delete(txn)
    return {"deleted": True}


# ── Stock purchases (one dealer invoice, made up of one or more line items) ─

@router.get("/stock-purchases", response_model=list[StockPurchaseRead])
async def list_stock_purchases(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[StockPurchaseRead]:
    repo = StockPurchaseRepository(db)
    records = await repo.list(current_user.org_id)
    return [StockPurchaseRead.model_validate(r) for r in records]


@router.post("/stock-purchases", response_model=StockPurchaseRead, status_code=201)
async def create_stock_purchase(
    body: StockPurchaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StockPurchaseRead:
    repo = StockPurchaseRepository(db)
    purchase = await repo.create(current_user.org_id, body)
    return StockPurchaseRead.model_validate(purchase)


@router.patch("/stock-purchases/{purchase_id}", response_model=StockPurchaseRead)
async def update_stock_purchase(
    purchase_id: uuid.UUID,
    body: StockPurchaseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StockPurchaseRead:
    repo = StockPurchaseRepository(db)
    purchase = await repo.get(purchase_id, current_user.org_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    purchase = await repo.update(purchase, body)
    return StockPurchaseRead.model_validate(purchase)


@router.delete("/stock-purchases/{purchase_id}")
async def delete_stock_purchase(
    purchase_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = StockPurchaseRepository(db)
    purchase = await repo.get(purchase_id, current_user.org_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    await repo.delete(purchase)
    return {"deleted": True}


@router.get("/stock-purchases/{purchase_id}/lines", response_model=list[StockTransactionRead])
async def list_stock_purchase_lines(
    purchase_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[StockTransactionRead]:
    repo = StockPurchaseRepository(db)
    purchase = await repo.get(purchase_id, current_user.org_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    txn_repo = StockTransactionRepository(db)
    records = await txn_repo.list_by_purchase(purchase_id)
    return [StockTransactionRead.model_validate(r) for r in records]


@router.post("/stock-purchases/{purchase_id}/bill-image")
async def upload_purchase_bill_image(
    purchase_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = StockPurchaseRepository(db)
    purchase = await repo.get(purchase_id, current_user.org_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    content_type = file.content_type or "application/octet-stream"
    if content_type not in s3_service.ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {content_type}")

    ext = content_type.split("/")[-1].replace("jpeg", "jpg")
    s3_key = f"stock-bills/{current_user.org_id}/{purchase_id}.{ext}"

    file_bytes = await file.read()
    try:
        await asyncio.to_thread(s3_service.upload_object, s3_key, file_bytes, content_type)
        download_url = s3_service.generate_download_url(s3_key)
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Photo storage isn't configured on the server. Contact support.",
        )

    purchase.bill_image_url = s3_key
    db.add(purchase)
    await db.flush()

    return {"bill_image_url": download_url}
