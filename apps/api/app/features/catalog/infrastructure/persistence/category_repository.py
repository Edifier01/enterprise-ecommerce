"""Category repository — SQLAlchemy implementation of ICategoryRepository."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.catalog.domain.entities import Category
from app.features.catalog.domain.ports import ICategoryRepository
from app.features.catalog.infrastructure.persistence.models import CategoryModel, ProductModel

_ACTIVE_PRODUCT_STATUS = "active"


class CategoryRepository(ICategoryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_active(self) -> list[Category]:
        counts_stmt = (
            select(ProductModel.category_id, func.count())
            .where(
                ProductModel.status == _ACTIVE_PRODUCT_STATUS,
                ProductModel.category_id.is_not(None),
            )
            .group_by(ProductModel.category_id)
        )
        count_rows = await self._session.execute(counts_stmt)
        product_counts = {row[0]: int(row[1]) for row in count_rows}

        stmt = (
            select(CategoryModel)
            .where(CategoryModel.is_active.is_(True))
            .order_by(CategoryModel.sort_order, CategoryModel.name)
        )
        rows = (await self._session.scalars(stmt)).all()
        return [
            self._to_domain(row, product_count=product_counts.get(row.id, 0))
            for row in rows
        ]

    async def get_by_slug(self, slug: str) -> Category | None:
        stmt = select(CategoryModel).where(
            CategoryModel.slug == slug,
            CategoryModel.is_active.is_(True),
        )
        row = (await self._session.scalars(stmt)).first()
        if row is None:
            return None

        count = await self._session.scalar(
            select(func.count())
            .select_from(ProductModel)
            .where(
                ProductModel.category_id == row.id,
                ProductModel.status == _ACTIVE_PRODUCT_STATUS,
            )
        )
        return self._to_domain(row, product_count=int(count or 0))

    @staticmethod
    def _to_domain(row: CategoryModel, *, product_count: int = 0) -> Category:
        return Category(
            id=row.id,
            slug=row.slug,
            name=row.name,
            description=row.description,
            parent_id=row.parent_id,
            is_active=row.is_active,
            sort_order=row.sort_order,
            product_count=product_count,
        )
