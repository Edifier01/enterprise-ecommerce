"""Product repository — SQLAlchemy implementation of IProductRepository."""

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.catalog.domain.entities import Product, ProductVariant
from app.features.catalog.domain.ports import IProductRepository
from app.features.catalog.infrastructure.persistence.models import (
    CategoryModel,
    ProductModel,
)


class ProductRepository(IProductRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_products(
        self,
        page: int,
        limit: int,
        category_slug: str | None = None,
    ) -> tuple[list[Product], int]:
        offset = (page - 1) * limit

        count_stmt = select(func.count()).select_from(ProductModel)
        stmt = select(ProductModel).order_by(ProductModel.created_at.desc())

        if category_slug is not None:
            category_filter = ProductModel.category_id.in_(
                select(CategoryModel.id).where(CategoryModel.slug == category_slug)
            )
            count_stmt = count_stmt.where(category_filter)
            stmt = stmt.where(category_filter)

        total = int((await self._session.scalar(count_stmt)) or 0)
        stmt = stmt.offset(offset).limit(limit)
        rows = (await self._session.scalars(stmt)).all()
        products = [self._to_domain(row) for row in rows]
        return products, total

    async def get_by_slug(self, slug: str) -> Product | None:
        stmt = (
            select(ProductModel)
            .where(ProductModel.slug == slug)
            .options(selectinload(ProductModel.variants))
        )
        row = (await self._session.scalars(stmt)).first()
        if row is None:
            return None
        return self._to_domain(row, include_variants=True)

    @staticmethod
    def _to_domain(row: ProductModel, *, include_variants: bool = False) -> Product:
        variants: tuple[ProductVariant, ...] = ()
        if include_variants:
            variants = tuple(
                ProductVariant(
                    id=v.id,
                    product_id=v.product_id,
                    sku=v.sku,
                    name=v.name,
                    price_cents=v.price_cents,
                    in_stock=v.in_stock,
                    is_default=v.is_default,
                    sort_order=v.sort_order,
                    attributes=dict(v.attributes or {}),
                )
                for v in row.variants
            )
        return Product(
            id=row.id,
            name=row.name,
            slug=row.slug,
            price_cents=row.price_cents,
            currency=row.currency,
            in_stock=row.in_stock,
            compare_at_price_cents=row.compare_at_price_cents,
            category_id=row.category_id,
            variants=variants,
        )
