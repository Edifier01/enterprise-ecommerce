"""Catalog domain ports — repository interfaces.

Defines the abstract contracts that the application layer depends on.
Infrastructure implementations must satisfy these interfaces.
"""

from abc import ABC, abstractmethod
from uuid import UUID

from app.features.catalog.domain.entities import Category, Product
from app.features.catalog.domain.product_list_filters import ProductListFacets, ProductListFilters


class IProductRepository(ABC):
    @abstractmethod
    async def list_products(
        self,
        page: int,
        limit: int,
        filters: ProductListFilters | None = None,
    ) -> tuple[list[Product], int]:
        """Return a paginated list of products and the total count."""
        ...

    @abstractmethod
    async def get_product_facets(
        self,
        category_slug: str | None = None,
        search_query: str | None = None,
        filters: ProductListFilters | None = None,
    ) -> ProductListFacets:
        """Return available filter facets for the given catalog scope."""
        ...

    @abstractmethod
    async def get_by_slug(self, slug: str) -> Product | None:
        """Return a single product with its variants by slug, or None if not found."""
        ...

    @abstractmethod
    async def get_by_slug_for_preview(self, slug: str) -> Product | None:
        """Return product by slug for admin preview (ignores storefront visibility)."""
        ...

    @abstractmethod
    async def search_products(
        self,
        query: str,
        page: int,
        limit: int,
        filters: ProductListFilters | None = None,
    ) -> tuple[list[Product], int]:
        """Return products matching the query by name or variant SKU."""
        ...


class ICategoryRepository(ABC):
    @abstractmethod
    async def list_active(self) -> list[Category]:
        """Return all active categories ordered by sort_order, name."""
        ...

    @abstractmethod
    async def get_by_slug(self, slug: str) -> Category | None:
        """Return a single active category by slug, or None if not found."""
        ...


class IVariantSourcePort(ABC):
    @abstractmethod
    async def is_erp_managed(self, variant_id: UUID) -> bool:
        """True when variant belongs to a MoySklad-synced product."""
        ...


class IStorefrontAvailabilityPort(ABC):
    @abstractmethod
    async def apply_availability(self, variant_id: UUID, available: int) -> None:
        """Recompute variant and product in_stock from sellable quantity."""
        ...
