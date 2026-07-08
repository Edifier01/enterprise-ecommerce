"""Get product by slug use case."""

from app.features.catalog.domain.entities import Product
from app.features.catalog.domain.ports import IProductRepository


class GetProductUseCase:
    def __init__(self, repository: IProductRepository) -> None:
        self._repository = repository

    async def execute(self, slug: str) -> Product | None:
        return await self._repository.get_by_slug(slug)
