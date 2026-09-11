from __future__ import annotations

import asyncio
import base64
import json
import logging
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.repositories.inventory import (
    InventoryItemRepository, StockPurchaseRepository, StockTransactionRepository,
)
from app.schemas.inventory import (
    ABUTMENT_TYPES,
    InventoryItemCreate, InventoryItemRead, InventoryItemUpdate,
    StockPurchaseCreate, StockPurchaseRead, StockPurchaseUpdate,
    StockTransactionCreate, StockTransactionRead,
)
from app.services import s3 as s3_service

logger = logging.getLogger("dentalhub.inventory")

# Keep in sync with app/services/chat.py CHAT_MODEL / implant_log_scan.py
_VISION_MODEL = "claude-opus-4-8"

_BILL_EXTRACTION_PROMPT = f"""
You are reading a dental implant/abutment supplier invoice or order confirmation (a photo or a PDF).

Extract two things:

1. Purchase header: supplier/company name, invoice or order date, order/invoice number, and
   the final total amount actually payable (the tax-inclusive grand total if one is shown,
   e.g. "Total Pay Amount" — otherwise the net total).

2. Every line item in the goods table. For each line, read off:
   - article_no: the article/SKU/reference number (e.g. "ABT1300")
   - raw_description: the description text exactly as printed
   - quantity: the quantity/qty column (integer)
   - net_cost: that line's own net total AFTER any discount (the "Total Net" column or
     equivalent) — never the pre-discount list price or unit price column.

   Then classify each line clinically:
   - category: "implant", "abutment", "kit", or "other"
   - If category is "implant": brand (manufacturer, e.g. "Alpha Bio Tech", "Nobel Biocare"),
     implant_system (product line, e.g. "Spiral", "NobelActive"), diameter_mm and length_mm
     as numbers — parse these straight out of the description (e.g. "D3.3mm L10.0mm" means
     diameter_mm=3.3, length_mm=10.0).
   - If category is "abutment": brand, and abutment_type — pick the SINGLE closest match from
     this exact list based on the description (match any angle in degrees mentioned; a
     "Multi-Unit"/"MUA"/tapered-connection/full-arch style description maps to one of the
     Multi-Unit options; a plain single-tooth screw-retained abutment maps to one of the Stock
     Abutment options):
     {', '.join(ABUTMENT_TYPES)}
     Set size_label to any remaining spec not captured above (e.g. "H2.5mm", "L 2.5mm").
   - If category is "kit" or "other": brand and size_label (a short description).

Return ONLY a JSON object (no markdown fences, no commentary) with this exact shape:

{{
  "purchase": {{
    "supplier_name": string or null, "purchase_date": "YYYY-MM-DD" or null,
    "order_ref": string or null, "total_amount": number or null
  }},
  "lines": [
    {{
      "article_no": string or null, "raw_description": string,
      "category": "implant"|"abutment"|"kit"|"other",
      "brand": string or null, "implant_system": string or null,
      "diameter_mm": number or null, "length_mm": number or null,
      "abutment_type": string or null, "size_label": string or null,
      "quantity": integer, "net_cost": number or null
    }}
  ],
  "warnings": [string, ...]
}}

Rules:
- Only include a line if its quantity is greater than 0. Skip subtotal/tax/summary rows.
- If a field is unclear, illegible, or not present, set it to null and add a short note to
  "warnings" — never guess a number.
- Convert any date to YYYY-MM-DD. If the year is written as 2 digits, assume 20XX.
- Return ONLY the JSON object, nothing else.
"""


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    return json.loads(text.strip())

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

@router.post("/stock-purchases/scan-bill")
async def scan_purchase_bill(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Reads a photo or PDF of a supplier invoice via Claude and returns draft
    header + line-item data. Nothing is saved here — the frontend shows an
    editable table and only saves what the doctor confirms.
    """
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Bill scanning is not configured yet. Ask your administrator to add ANTHROPIC_API_KEY.",
        )

    try:
        import anthropic
    except ImportError:
        raise HTTPException(status_code=503, detail="Bill scanning is not available on this server.")

    content_type = file.content_type or "application/octet-stream"
    content = await file.read()
    b64 = base64.b64encode(content).decode("ascii")

    if content_type == "application/pdf":
        block = {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": b64}}
    elif content_type in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        block = {"type": "image", "source": {"type": "base64", "media_type": content_type, "data": b64}}
    else:
        raise HTTPException(status_code=400, detail=f"File type not supported for scanning: {content_type}")

    try:
        async with anthropic.AsyncAnthropic(api_key=api_key) as ai_client:
            response = await ai_client.messages.create(
                model=_VISION_MODEL,
                max_tokens=4096,
                messages=[{
                    "role": "user",
                    "content": [block, {"type": "text", "text": _BILL_EXTRACTION_PROMPT}],
                }],
            )
        text = next((b.text for b in response.content if b.type == "text"), "")
        parsed = _extract_json(text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=422,
            detail="Could not read a structured result from this bill — try a clearer photo or a text-based PDF.",
        )
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=503, detail="AI service is misconfigured on the server.")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=503, detail="AI service is busy right now — try again in a minute.")
    except Exception as exc:
        logger.exception("Failed to scan purchase bill %s", file.filename)
        raise HTTPException(status_code=500, detail=f"Could not process this bill: {exc}")

    return {
        "purchase": parsed.get("purchase") or {},
        "lines": parsed.get("lines") or [],
        "warnings": parsed.get("warnings") or [],
    }


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
