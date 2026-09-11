from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, field_validator, model_serializer

from app.services import s3 as s3_service

CATEGORIES = ["implant", "abutment", "kit", "other"]

# Must match the abutment_type options in frontend/src/components/AbutmentFormModal.js
ABUTMENT_TYPES = [
    "Stock Abutment Straight",
    "Stock Abutment Angled 15°",
    "Stock Abutment Angled 17°",
    "Stock Abutment Angled 25°",
    "Multi-Unit Abutment (MUA) Straight",
    "MUA Angled 15°",
    "MUA Angled 17°",
    "MUA Angled 25°",
    "MUA Angled 30°",
    "MUA Angled 35°",
    "MUA Angled 40°",
    "MUA Angled 45°",
    "MUA Angled 50°",
    "MUA Angled 60°",
    "Ball Abutment",
    "Locator Abutment",
]


class InventoryItemBase(BaseModel):
    category: str = "implant"
    brand: str | None = None
    implant_system: str | None = None
    diameter_mm: float | None = None
    length_mm: float | None = None
    abutment_type: str | None = None
    size_label: str | None = None
    article_no: str | None = None
    low_stock_threshold: int = 5
    usage_threshold: int | None = None  # kits only — implant surgeries before drill bits need replacing
    notes: str | None = None
    clinic_id: uuid.UUID | None = None

    @field_validator('clinic_id', mode='before')
    @classmethod
    def _empty_uuid(cls, v):
        return None if v == '' else v

    @field_validator('brand', 'implant_system', 'abutment_type', 'size_label', 'article_no', 'notes', mode='before')
    @classmethod
    def _empty_str(cls, v):
        return None if v == '' else v

    @field_validator('diameter_mm', 'length_mm', mode='before')
    @classmethod
    def _empty_number(cls, v):
        return None if v in ('', None) else v

    @field_validator('usage_threshold', mode='before')
    @classmethod
    def _empty_int(cls, v):
        return None if v in ('', None) else v


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(InventoryItemBase):
    category: str | None = None


class InventoryItemRead(InventoryItemBase):
    id: uuid.UUID
    org_id: uuid.UUID
    created_at: datetime
    available_quantity: int = 0
    kit_usage_count: int | None = None  # kits only — implant surgeries logged since this kit was added

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d


class StockPurchaseBase(BaseModel):
    purchase_date: date
    supplier_name: str | None = None
    order_ref: str | None = None
    total_amount: float | None = None
    bill_image_url: str | None = None
    notes: str | None = None

    @field_validator('purchase_date', mode='before')
    @classmethod
    def _empty_date(cls, v):
        return None if v == '' else v

    @field_validator('supplier_name', 'order_ref', 'bill_image_url', 'notes', mode='before')
    @classmethod
    def _empty_str(cls, v):
        return None if v == '' else v

    @field_validator('total_amount', mode='before')
    @classmethod
    def _empty_number(cls, v):
        return None if v in ('', None) else v


class StockPurchaseCreate(StockPurchaseBase):
    pass


class StockPurchaseUpdate(StockPurchaseBase):
    purchase_date: date | None = None


class StockPurchaseRead(StockPurchaseBase):
    id: uuid.UUID
    org_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        # bill_image_url is stored as a raw S3/R2 key — resolve it to a
        # fresh presigned download URL whenever the record is read.
        key = d.get("bill_image_url")
        if key and not key.startswith("http"):
            try:
                d["bill_image_url"] = s3_service.generate_download_url(key)
            except Exception:
                pass
        return d


class StockTransactionBase(BaseModel):
    transaction_type: str  # 'in' | 'out'
    quantity: int
    unit_cost: float | None = None
    purchase_id: uuid.UUID | None = None
    line_net_cost: float | None = None
    patient_id: uuid.UUID | None = None
    transaction_date: date
    notes: str | None = None

    @field_validator('purchase_id', 'patient_id', mode='before')
    @classmethod
    def _empty_uuid(cls, v):
        return None if v == '' else v

    @field_validator('transaction_date', mode='before')
    @classmethod
    def _empty_date(cls, v):
        return None if v == '' else v

    @field_validator('notes', mode='before')
    @classmethod
    def _empty_str(cls, v):
        return None if v == '' else v

    @field_validator('unit_cost', 'line_net_cost', mode='before')
    @classmethod
    def _empty_number(cls, v):
        return None if v in ('', None) else v


class StockTransactionCreate(StockTransactionBase):
    pass


class StockTransactionRead(StockTransactionBase):
    id: uuid.UUID
    inventory_item_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d


class CatalogueReferenceEntry(BaseModel):
    """One article-number mapping extracted from a scanned catalogue."""
    article_no: str
    raw_description: str | None = None
    category: str = "implant"
    brand: str | None = None
    implant_system: str | None = None
    diameter_mm: float | None = None
    length_mm: float | None = None
    abutment_type: str | None = None
    size_label: str | None = None


class CatalogueReferenceRead(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    article_no: str
    category: str
    brand: str | None = None
    implant_system: str | None = None
    diameter_mm: float | None = None
    length_mm: float | None = None
    abutment_type: str | None = None
    size_label: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _inject_id_alias(self, handler: Any) -> dict:
        d = handler(self)
        d["_id"] = d["id"]
        return d
