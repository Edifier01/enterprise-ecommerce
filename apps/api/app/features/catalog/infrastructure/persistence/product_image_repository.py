"""Product gallery images — site-owned display layer."""

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.integrations.moysklad.infrastructure.persistence.models import ProductImageModel


class ProductImageNotFoundError(Exception):
    """Raised when image id does not exist."""


class ProductImageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_product(self, product_id: uuid.UUID) -> list[ProductImageModel]:
        stmt = (
            select(ProductImageModel)
            .where(ProductImageModel.product_id == product_id)
            .order_by(ProductImageModel.sort_order.asc(), ProductImageModel.created_at.asc())
        )
        return list((await self._session.scalars(stmt)).all())

    async def create(
        self,
        *,
        product_id: uuid.UUID,
        url: str,
        alt_text: str | None = None,
        sort_order: int = 0,
    ) -> ProductImageModel:
        row = ProductImageModel(
            id=uuid.uuid4(),
            product_id=product_id,
            url=url.strip(),
            alt_text=alt_text.strip() if alt_text else None,
            sort_order=sort_order,
        )
        self._session.add(row)
        await self._session.flush()
        return row

    async def update(
        self,
        image_id: uuid.UUID,
        *,
        url: str | None = None,
        alt_text: str | None = None,
        sort_order: int | None = None,
    ) -> ProductImageModel:
        row = await self._session.get(ProductImageModel, image_id)
        if row is None:
            raise ProductImageNotFoundError()
        if url is not None:
            row.url = url.strip()
        if alt_text is not None:
            row.alt_text = alt_text.strip() or None
        if sort_order is not None:
            row.sort_order = sort_order
        await self._session.flush()
        return row

    async def delete(self, image_id: uuid.UUID) -> None:
        stmt = delete(ProductImageModel).where(ProductImageModel.id == image_id)
        result = await self._session.execute(stmt)
        if result.rowcount == 0:
            raise ProductImageNotFoundError()

    async def count_for_product(self, product_id: uuid.UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(ProductImageModel)
            .where(ProductImageModel.product_id == product_id)
        )
        return int((await self._session.scalar(stmt)) or 0)
