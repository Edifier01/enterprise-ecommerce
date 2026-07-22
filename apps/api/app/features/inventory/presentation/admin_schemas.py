"""Admin inventory API schemas."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.features.inventory.domain.admin_ports import INVENTORY_ADJUST_REASONS


class AdminInventoryItemSchema(BaseModel):
    variant_id: UUID
    product_id: UUID
    sku: str
    product_name: str
    sync_source: str
    quantity_on_hand: int
    quantity_reserved: int
    available: int
    version: int
    is_low_stock: bool


class AdminInventoryProductGroupSchema(BaseModel):
    product_id: UUID
    product_name: str
    sync_source: str
    total_on_hand: int
    total_reserved: int
    total_available: int
    is_low_stock: bool
    variant_count: int
    variants: list[AdminInventoryItemSchema]


class AdminInventoryListResponse(BaseModel):
    items: list[AdminInventoryItemSchema] = Field(default_factory=list)
    groups: list[AdminInventoryProductGroupSchema] = Field(default_factory=list)
    group_by: Literal["variant", "product"] = "variant"
    total: int
    page: int
    limit: int
    low_stock_threshold: int


class AdminInventoryOverviewResponse(BaseModel):
    total_variants: int
    total_products: int
    low_stock_variants: int
    low_stock_products: int
    out_of_stock_variants: int
    out_of_stock_products: int
    low_stock_threshold: int


class AdminAdjustInventoryRequest(BaseModel):
    quantity_on_hand: int = Field(ge=0)
    reason: str
    version: int = Field(ge=0)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        if value not in INVENTORY_ADJUST_REASONS:
            raise ValueError("invalid adjustment reason")
        return value
