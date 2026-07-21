"""Pydantic schemas for admin catalog API."""

import re
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.features.catalog.domain.admin_ports import PRODUCT_STATUSES
from app.features.catalog.domain.media_url import validate_admin_media_url
from app.features.catalog.presentation.schemas import CategorySchema, ProductVariantSchema

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_SKU_RE = re.compile(r"^[A-Za-z0-9-]{3,64}$")


class ProductImageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    url: str
    alt_text: str | None = None
    option_color: str | None = None
    sort_order: int = 0


class AdminProductSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    price_cents: int
    compare_at_price_cents: int | None = None
    currency: str
    in_stock: bool
    status: str
    category_id: UUID | None = None
    description: str | None = None
    image_url: str | None = None
    sync_source: str = "manual"
    erp_name: str | None = None
    moysklad_product_id: str | None = None
    last_synced_at: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    erp_image_url: str | None = None
    images: list[ProductImageSchema] = []
    variants: list[ProductVariantSchema] = []


class AdminProductListResponse(BaseModel):
    items: list[AdminProductSchema]
    total: int
    page: int
    limit: int


class AdminCreateProductRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    sku: str = Field(min_length=3, max_length=64)
    price_cents: int = Field(ge=0)
    currency: str = Field(default="RUB", min_length=3, max_length=3)
    status: str = Field(default="draft")
    compare_at_price_cents: int | None = Field(default=None, ge=0)
    category_id: UUID | None = None
    wholesale_price_cents: int | None = Field(default=None, ge=0)
    description: str | None = Field(default=None, max_length=10000)
    image_url: str | None = Field(default=None, max_length=2048)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not _SLUG_RE.match(normalized):
            raise ValueError("slug must be lowercase alphanumeric with hyphens")
        return normalized

    @field_validator("sku")
    @classmethod
    def validate_sku(cls, value: str) -> str:
        normalized = value.strip()
        if not _SKU_RE.match(normalized):
            raise ValueError("sku must be 3-64 alphanumeric or hyphen characters")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in PRODUCT_STATUSES:
            raise ValueError("invalid product status")
        return value

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, value: str | None) -> str | None:
        if value is None or value.strip() == "":
            return None
        return validate_admin_media_url(value)


class AdminUpdateProductRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, min_length=1, max_length=255)
    price_cents: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    status: str | None = None
    compare_at_price_cents: int | None = Field(default=None, ge=0)
    category_id: UUID | None = None
    clear_category: bool = False
    description: str | None = Field(default=None, max_length=10000)
    image_url: str | None = Field(default=None, max_length=2048)
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = Field(default=None, max_length=5000)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip().lower()
        if not _SLUG_RE.match(normalized):
            raise ValueError("slug must be lowercase alphanumeric with hyphens")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in PRODUCT_STATUSES:
            raise ValueError("invalid product status")
        return value

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, value: str | None) -> str | None:
        if value is None or value.strip() == "":
            return None
        return validate_admin_media_url(value)


class AdminCreateProductImageRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    alt_text: str | None = Field(default=None, max_length=255)
    option_color: str | None = Field(default=None, max_length=64)
    sort_order: int = Field(default=0, ge=0)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        return validate_admin_media_url(value)


class AdminUpdateProductImageRequest(BaseModel):
    url: str | None = Field(default=None, min_length=1, max_length=2048)
    alt_text: str | None = Field(default=None, max_length=255)
    option_color: str | None = Field(default=None, max_length=64)
    sort_order: int | None = Field(default=None, ge=0)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str | None) -> str | None:
        if value is None or value.strip() == "":
            return None
        return validate_admin_media_url(value)


class AdminCreateVariantRequest(BaseModel):
    sku: str = Field(min_length=3, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    price_cents: int = Field(ge=0)
    wholesale_price_cents: int | None = Field(default=None, ge=0)
    is_default: bool = False
    sort_order: int = Field(default=0, ge=0)
    attributes: dict[str, str] = Field(default_factory=dict)

    @field_validator("sku")
    @classmethod
    def validate_sku(cls, value: str) -> str:
        normalized = value.strip()
        if not _SKU_RE.match(normalized):
            raise ValueError("sku must be 3-64 alphanumeric or hyphen characters")
        return normalized


class AdminUpdateVariantRequest(BaseModel):
    sku: str | None = Field(default=None, min_length=3, max_length=64)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    price_cents: int | None = Field(default=None, ge=0)
    wholesale_price_cents: int | None = Field(default=None, ge=0)
    is_default: bool | None = None
    sort_order: int | None = Field(default=None, ge=0)
    attributes: dict[str, str] | None = None

    @field_validator("sku")
    @classmethod
    def validate_sku(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        if not _SKU_RE.match(normalized):
            raise ValueError("sku must be 3-64 alphanumeric or hyphen characters")
        return normalized


class AdminCategoryListResponse(BaseModel):
    items: list[CategorySchema]
    total: int


class AdminCreateCategoryRequest(BaseModel):
    slug: str = Field(min_length=1, max_length=255)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    parent_id: UUID | None = None
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not _SLUG_RE.match(normalized):
            raise ValueError("slug must be lowercase alphanumeric with hyphens")
        return normalized


class AdminUpdateCategoryRequest(BaseModel):
    slug: str | None = Field(default=None, min_length=1, max_length=255)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    parent_id: UUID | None = None
    clear_parent: bool = False
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip().lower()
        if not _SLUG_RE.match(normalized):
            raise ValueError("slug must be lowercase alphanumeric with hyphens")
        return normalized
