"""List categories use case."""

from app.features.catalog.domain.entities import Category
from app.features.catalog.domain.ports import ICategoryRepository


class ListCategoriesUseCase:
    def __init__(self, repository: ICategoryRepository) -> None:
        self._repository = repository

    async def execute(self) -> list[Category]:
        return await self._repository.list_active()
