"""List products use case."""

from app.features.catalog.domain.entities import Product
from app.features.catalog.domain.product_list_filters import ProductListFilters
from app.features.catalog.domain.ports import IProductRepository


class ListProductsUseCase:
    def __init__(self, repository: IProductRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        page: int,
        limit: int,
        filters: ProductListFilters | None = None,
    ) -> tuple[list[Product], int]:
        page = max(page, 1)
        limit = min(max(limit, 1), 100)
        return await self._repository.list_products(
            page=page,
            limit=limit,
            filters=filters,
        )
