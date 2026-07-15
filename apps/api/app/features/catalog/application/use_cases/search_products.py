"""Search products use case."""

from app.features.catalog.domain.entities import Product
from app.features.catalog.domain.product_list_filters import ProductListFilters
from app.features.catalog.domain.ports import IProductRepository


class SearchProductsUseCase:
    def __init__(self, repository: IProductRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        query: str,
        page: int,
        limit: int,
        filters: ProductListFilters | None = None,
    ) -> tuple[list[Product], int]:
        normalized = query.strip()
        if not normalized:
            raise ValueError("Search query must not be empty")
        if len(normalized) > 100:
            raise ValueError("Search query must be at most 100 characters")

        page = max(page, 1)
        limit = min(max(limit, 1), 100)
        return await self._repository.search_products(
            query=normalized,
            page=page,
            limit=limit,
            filters=filters,
        )
