"""Category repository — SQLAlchemy implementation of ICategoryRepository."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.catalog.domain.entities import Category
from app.features.catalog.domain.ports import ICategoryRepository
from app.features.catalog.infrastructure.persistence.models import CategoryModel


class CategoryRepository(ICategoryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_active(self) -> list[Category]:
        stmt = (
            select(CategoryModel)
            .where(CategoryModel.is_active.is_(True))
            .order_by(CategoryModel.sort_order, CategoryModel.name)
        )
        rows = (await self._session.scalars(stmt)).all()
        return [self._to_domain(row) for row in rows]

    async def get_by_slug(self, slug: str) -> Category | None:
        stmt = select(CategoryModel).where(
            CategoryModel.slug == slug,
            CategoryModel.is_active.is_(True),
        )
        row = (await self._session.scalars(stmt)).first()
        return self._to_domain(row) if row is not None else None

    @staticmethod
    def _to_domain(row: CategoryModel) -> Category:
        return Category(
            id=row.id,
            slug=row.slug,
            name=row.name,
            description=row.description,
            parent_id=row.parent_id,
            is_active=row.is_active,
            sort_order=row.sort_order,
        )
