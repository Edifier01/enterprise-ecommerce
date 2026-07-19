"""Admin inventory API schemas."""

from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.features.inventory.domain.admin_ports import INVENTORY_ADJUST_REASONS


class AdminInventoryItemSchema(BaseModel):
    variant_id: UUID
    sku: str
    product_name: str
    sync_source: str
    quantity_on_hand: int
    quantity_reserved: int
    available: int
    version: int
    is_low_stock: bool


class AdminInventoryListResponse(BaseModel):
    items: list[AdminInventoryItemSchema]
    total: int
    page: int
    limit: int
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
