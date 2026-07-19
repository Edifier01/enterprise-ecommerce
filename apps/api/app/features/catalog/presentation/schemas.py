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
    moysklad_variant_id: str | None = None
    barcode: str | None = None
    weight_grams: int | None = None
    dimensions_cm: dict[str, float] | None = None


class ProductOptionGroupSchema(BaseModel):
    key: str
    label: str
    values: list[str]


class ProductImagePublicSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    url: str
    alt_text: str | None = None
    sort_order: int = 0
    option_color: str | None = None


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
    description: str | None = None
    image_url: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    option_groups: list[ProductOptionGroupSchema] = []
    images: list[ProductImagePublicSchema] = []
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
    size_counts: dict[str, int] = {}
    color_counts: dict[str, int] = {}


class CategorySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    description: str | None
    parent_id: UUID | None
    is_active: bool
    sort_order: int
    product_count: int = 0


class CategoryListResponse(BaseModel):
    items: list[CategorySchema]
    total: int
