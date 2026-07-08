"""Catalog domain ports — repository interfaces.

Defines the abstract contracts that the application layer depends on.
Infrastructure implementations must satisfy these interfaces.
"""

from abc import ABC, abstractmethod

from app.features.catalog.domain.entities import Category, Product


class IProductRepository(ABC):
    @abstractmethod
    async def list_products(
        self,
        page: int,
        limit: int,
        category_slug: str | None = None,
    ) -> tuple[list[Product], int]:
        """Return a paginated list of products and the total count.

        When ``category_slug`` is provided, only products whose primary category
        matches the slug are returned.
        """
        ...

    @abstractmethod
    async def get_by_slug(self, slug: str) -> Product | None:
        """Return a single product with its variants by slug, or None if not found."""
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
