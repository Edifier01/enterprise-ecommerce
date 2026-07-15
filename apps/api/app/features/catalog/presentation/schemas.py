"""Pydantic schemas for catalog API."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProductVariantSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sku: str
    name: str
    price_cents: int
    wholesale_price_cents: int | None = None
    in_stock: bool
    is_default: bool
    sort_order: int
    attributes: dict[str, str]


class ProductSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    price_cents: int
    compare_at_price_cents: int | None = None
    currency: str
    in_stock: bool
    category_id: UUID | None = None
    variants: list[ProductVariantSchema] = []


class ProductListResponse(BaseModel):
    items: list[ProductSchema]
    total: int
    page: int
    limit: int


class ProductFacetsResponse(BaseModel):
    sizes: list[str]
    colors: list[str]
    price_min_cents: int
    price_max_cents: int


class CategorySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    description: str | None
    parent_id: UUID | None
    is_active: bool
    sort_order: int


class CategoryListResponse(BaseModel):
    items: list[CategorySchema]
    total: int
