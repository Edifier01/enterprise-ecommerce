"""Catalog domain entities."""

from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class ProductVariant:
    """A purchasable SKU within a Product aggregate."""

    id: UUID
    product_id: UUID
    sku: str
    name: str
    price_cents: int
    in_stock: bool
    is_default: bool
    sort_order: int
    wholesale_price_cents: int | None = None
    attributes: dict[str, str] = field(default_factory=dict)
    moysklad_variant_id: str | None = None
    barcode: str | None = None
    weight_grams: int | None = None
    dimensions_cm: dict[str, float] | None = None


@dataclass(frozen=True, slots=True)
class Product:
    id: UUID
    name: str
    slug: str
    price_cents: int
    currency: str
    in_stock: bool
    status: str = "active"
    compare_at_price_cents: int | None = None
    category_id: UUID | None = None
    description: str | None = None
    image_url: str | None = None
    sync_source: str = "manual"
    erp_name: str | None = None
    moysklad_product_id: str | None = None
    last_synced_at: datetime | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    erp_image_url: str | None = None
    variants: tuple[ProductVariant, ...] = ()

    def __post_init__(self) -> None:
        # Domain invariant: a "was" price only makes sense above the current price.
        if (
            self.compare_at_price_cents is not None
            and self.compare_at_price_cents <= self.price_cents
        ):
            raise ValueError("compare_at_price_cents must be greater than price_cents")


@dataclass(frozen=True, slots=True)
class Category:
    id: UUID
    slug: str
    name: str
    description: str | None
    parent_id: UUID | None
    is_active: bool
    sort_order: int
    product_count: int = 0
