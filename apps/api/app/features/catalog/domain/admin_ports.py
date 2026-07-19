"""Admin catalog repository port — CRUD for backoffice."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID

from app.features.catalog.domain.entities import Category, Product, ProductVariant

PRODUCT_STATUSES = frozenset({"draft", "active", "archived"})


class DuplicateSlugError(Exception):
    """Raised when slug is already taken."""


class DuplicateSkuError(Exception):
    """Raised when SKU is already taken."""


class ProductNotFoundError(Exception):
    """Raised when product id does not exist."""


class VariantNotFoundError(Exception):
    """Raised when variant id does not exist."""


class CategoryNotFoundError(Exception):
    """Raised when category id does not exist."""


class InvalidCategoryParentError(Exception):
    """Raised when parent is invalid (non-root parent or root with children)."""


class SyncProtectedFieldError(Exception):
    """Raised when admin attempts to edit MoySklad-owned fields."""


@dataclass(frozen=True, slots=True)
class CreateProductData:
    name: str
    slug: str
    price_cents: int
    currency: str
    status: str
    sku: str
    compare_at_price_cents: int | None = None
    category_id: UUID | None = None
    wholesale_price_cents: int | None = None
    description: str | None = None
    image_url: str | None = None


@dataclass(frozen=True, slots=True)
class UpdateProductData:
    name: str | None = None
    slug: str | None = None
    price_cents: int | None = None
    currency: str | None = None
    status: str | None = None
    compare_at_price_cents: int | None = None
    category_id: UUID | None = None
    clear_category: bool = False
    description: str | None = None
    image_url: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None


@dataclass(frozen=True, slots=True)
class CreateVariantData:
    product_id: UUID
    sku: str
    name: str
    price_cents: int
    wholesale_price_cents: int | None = None
    is_default: bool = False
    sort_order: int = 0
    attributes: dict[str, str] | None = None


@dataclass(frozen=True, slots=True)
class UpdateVariantData:
    sku: str | None = None
    name: str | None = None
    price_cents: int | None = None
    wholesale_price_cents: int | None = None
    is_default: bool | None = None
    sort_order: int | None = None
    attributes: dict[str, str] | None = None


@dataclass(frozen=True, slots=True)
class CreateCategoryData:
    slug: str
    name: str
    description: str | None = None
    parent_id: UUID | None = None
    is_active: bool = True
    sort_order: int = 0


@dataclass(frozen=True, slots=True)
class UpdateCategoryData:
    slug: str | None = None
    name: str | None = None
    description: str | None = None
    parent_id: UUID | None = None
    clear_parent: bool = False
    is_active: bool | None = None
    sort_order: int | None = None


class IAdminCatalogRepository(ABC):
    @abstractmethod
    async def list_products(
        self,
        page: int,
        limit: int,
        status: str | None = None,
        q: str | None = None,
        category_id: UUID | None = None,
        uncategorized: bool = False,
        needs_styling: bool = False,
        sync_source: str | None = None,
        moysklad_pending: bool = False,
    ) -> tuple[list[Product], int]:
        ...

    @abstractmethod
    async def get_product_by_id(self, product_id: UUID) -> Product | None:
        ...

    @abstractmethod
    async def create_product(self, data: CreateProductData) -> Product:
        ...

    @abstractmethod
    async def update_product(self, product_id: UUID, data: UpdateProductData) -> Product:
        ...

    @abstractmethod
    async def create_variant(self, data: CreateVariantData) -> ProductVariant:
        ...

    @abstractmethod
    async def update_variant(self, variant_id: UUID, data: UpdateVariantData) -> ProductVariant:
        ...

    @abstractmethod
    async def list_categories(self) -> list[Category]:
        ...

    @abstractmethod
    async def get_category_by_id(self, category_id: UUID) -> Category | None:
        ...

    @abstractmethod
    async def create_category(self, data: CreateCategoryData) -> Category:
        ...

    @abstractmethod
    async def update_category(self, category_id: UUID, data: UpdateCategoryData) -> Category:
        ...

    @abstractmethod
    async def delete_category(self, category_id: UUID) -> None:
        ...
