"""Get product filter facets for a catalog scope."""

from app.features.catalog.domain.product_list_filters import ProductListFacets
from app.features.catalog.domain.ports import IProductRepository


class GetProductFacetsUseCase:
    def __init__(self, repository: IProductRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        category_slug: str | None = None,
        search_query: str | None = None,
    ) -> ProductListFacets:
        return await self._repository.get_product_facets(
            category_slug=category_slug,
            search_query=search_query,
        )
