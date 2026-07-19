"""Category ↔ MoySklad folder mapping repository."""

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.integrations.moysklad.infrastructure.persistence.models import (
    CategoryMoySkladMappingModel,
)


class CategoryMappingNotFoundError(Exception):
    """Raised when mapping id does not exist."""


class DuplicateCategoryMappingError(Exception):
    """Raised when category or folder is already mapped."""


class CategoryMappingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[CategoryMoySkladMappingModel]:
        stmt = select(CategoryMoySkladMappingModel).order_by(
            CategoryMoySkladMappingModel.created_at.asc()
        )
        return list((await self._session.scalars(stmt)).all())

    async def create(
        self,
        *,
        category_id: uuid.UUID,
        moysklad_folder_id: str,
    ) -> CategoryMoySkladMappingModel:
        existing_category = await self._session.scalar(
            select(CategoryMoySkladMappingModel).where(
                CategoryMoySkladMappingModel.category_id == category_id
            )
        )
        if existing_category is not None:
            raise DuplicateCategoryMappingError("Category is already mapped")

        existing_folder = await self._session.scalar(
            select(CategoryMoySkladMappingModel).where(
                CategoryMoySkladMappingModel.moysklad_folder_id == moysklad_folder_id.strip()
            )
        )
        if existing_folder is not None:
            raise DuplicateCategoryMappingError("MoySklad folder is already mapped")

        row = CategoryMoySkladMappingModel(
            id=uuid.uuid4(),
            category_id=category_id,
            moysklad_folder_id=moysklad_folder_id.strip(),
        )
        self._session.add(row)
        await self._session.flush()
        return row

    async def delete(self, mapping_id: uuid.UUID) -> None:
        stmt = delete(CategoryMoySkladMappingModel).where(
            CategoryMoySkladMappingModel.id == mapping_id
        )
        result = await self._session.execute(stmt)
        if result.rowcount == 0:
            raise CategoryMappingNotFoundError()
