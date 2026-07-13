"""Admin catalog repository — SQLAlchemy implementation."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.catalog.domain.admin_ports import (
    CategoryNotFoundError,
    CreateCategoryData,
    CreateProductData,
    CreateVariantData,
    DuplicateSkuError,
    DuplicateSlugError,
    IAdminCatalogRepository,
    ProductNotFoundError,
    UpdateCategoryData,
    UpdateProductData,
    UpdateVariantData,
    VariantNotFoundError,
)
from app.features.catalog.domain.entities import Category, Product, ProductVariant
from app.features.catalog.infrastructure.persistence.models import (
    CategoryModel,
    ProductModel,
    ProductVariantModel,
)


class AdminCatalogRepository(IAdminCatalogRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_products(
        self,
        page: int,
        limit: int,
        status: str | None = None,
    ) -> tuple[list[Product], int]:
        offset = (page - 1) * limit
        filters = []
        if status is not None:
            filters.append(ProductModel.status == status)

        count_stmt = select(func.count()).select_from(ProductModel)
        stmt = select(ProductModel).order_by(ProductModel.updated_at.desc())
        if filters:
            count_stmt = count_stmt.where(*filters)
            stmt = stmt.where(*filters)

        total = int((await self._session.scalar(count_stmt)) or 0)
        rows = (
            await self._session.scalars(stmt.offset(offset).limit(limit))
        ).all()
        return [self._product_to_domain(row) for row in rows], total

    async def get_product_by_id(self, product_id: uuid.UUID) -> Product | None:
        stmt = (
            select(ProductModel)
            .where(ProductModel.id == product_id)
            .options(selectinload(ProductModel.variants))
        )
        row = (await self._session.scalars(stmt)).first()
        if row is None:
            return None
        return self._product_to_domain(row, include_variants=True)

    async def create_product(self, data: CreateProductData) -> Product:
        product_id = uuid.uuid4()
        product = ProductModel(
            id=product_id,
            name=data.name,
            slug=data.slug,
            price_cents=data.price_cents,
            compare_at_price_cents=data.compare_at_price_cents,
            currency=data.currency,
            in_stock=True,
            status=data.status,
            category_id=data.category_id,
        )
        self._session.add(product)
        variant = ProductVariantModel(
            id=uuid.uuid4(),
            product_id=product_id,
            sku=data.sku,
            name=data.name,
            price_cents=data.price_cents,
            wholesale_price_cents=data.wholesale_price_cents,
            in_stock=True,
            is_default=True,
            sort_order=0,
            attributes={},
        )
        self._session.add(variant)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            await self._session.rollback()
            self._raise_integrity(exc)
        stmt = (
            select(ProductModel)
            .where(ProductModel.id == product_id)
            .options(selectinload(ProductModel.variants))
        )
        row = (await self._session.scalars(stmt)).one()
        return self._product_to_domain(row, include_variants=True)

    async def update_product(self, product_id: uuid.UUID, data: UpdateProductData) -> Product:
        product = await self._session.get(
            ProductModel,
            product_id,
            options=[selectinload(ProductModel.variants)],
        )
        if product is None:
            raise ProductNotFoundError(str(product_id))

        if data.name is not None:
            product.name = data.name
        if data.slug is not None:
            product.slug = data.slug
        if data.price_cents is not None:
            product.price_cents = data.price_cents
        if data.currency is not None:
            product.currency = data.currency
        if data.status is not None:
            product.status = data.status
        if data.compare_at_price_cents is not None:
            product.compare_at_price_cents = data.compare_at_price_cents
        if data.clear_category:
            product.category_id = None
        elif data.category_id is not None:
            product.category_id = data.category_id

        try:
            await self._session.flush()
        except IntegrityError as exc:
            await self._session.rollback()
            self._raise_integrity(exc)

        return self._product_to_domain(product, include_variants=True)

    async def create_variant(self, data: CreateVariantData) -> ProductVariant:
        product = await self._session.get(ProductModel, data.product_id)
        if product is None:
            raise ProductNotFoundError(str(data.product_id))

        if data.is_default:
            existing = (
                await self._session.scalars(
                    select(ProductVariantModel).where(
                        ProductVariantModel.product_id == data.product_id
                    )
                )
            ).all()
            for variant in existing:
                variant.is_default = False

        variant = ProductVariantModel(
            id=uuid.uuid4(),
            product_id=data.product_id,
            sku=data.sku,
            name=data.name,
            price_cents=data.price_cents,
            wholesale_price_cents=data.wholesale_price_cents,
            in_stock=True,
            is_default=data.is_default,
            sort_order=data.sort_order,
            attributes=data.attributes or {},
        )
        self._session.add(variant)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            await self._session.rollback()
            self._raise_integrity(exc)
        await self._session.refresh(variant)
        return self._variant_to_domain(variant)

    async def update_variant(self, variant_id: uuid.UUID, data: UpdateVariantData) -> ProductVariant:
        variant = await self._session.get(ProductVariantModel, variant_id)
        if variant is None:
            raise VariantNotFoundError(str(variant_id))

        if data.is_default is True:
            siblings = (
                await self._session.scalars(
                    select(ProductVariantModel).where(
                        ProductVariantModel.product_id == variant.product_id,
                        ProductVariantModel.id != variant_id,
                    )
                )
            ).all()
            for sibling in siblings:
                sibling.is_default = False

        if data.sku is not None:
            variant.sku = data.sku
        if data.name is not None:
            variant.name = data.name
        if data.price_cents is not None:
            variant.price_cents = data.price_cents
        if data.wholesale_price_cents is not None:
            variant.wholesale_price_cents = data.wholesale_price_cents
        if data.is_default is not None:
            variant.is_default = data.is_default
        if data.sort_order is not None:
            variant.sort_order = data.sort_order
        if data.attributes is not None:
            variant.attributes = data.attributes

        try:
            await self._session.flush()
        except IntegrityError as exc:
            await self._session.rollback()
            self._raise_integrity(exc)

        return self._variant_to_domain(variant)

    async def list_categories(self) -> list[Category]:
        stmt = select(CategoryModel).order_by(CategoryModel.sort_order, CategoryModel.name)
        rows = (await self._session.scalars(stmt)).all()
        return [self._category_to_domain(row) for row in rows]

    async def get_category_by_id(self, category_id: uuid.UUID) -> Category | None:
        row = await self._session.get(CategoryModel, category_id)
        return self._category_to_domain(row) if row is not None else None

    async def create_category(self, data: CreateCategoryData) -> Category:
        category = CategoryModel(
            id=uuid.uuid4(),
            slug=data.slug,
            name=data.name,
            description=data.description,
            parent_id=data.parent_id,
            is_active=data.is_active,
            sort_order=data.sort_order,
        )
        self._session.add(category)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            await self._session.rollback()
            self._raise_integrity(exc)
        await self._session.refresh(category)
        return self._category_to_domain(category)

    async def update_category(self, category_id: uuid.UUID, data: UpdateCategoryData) -> Category:
        category = await self._session.get(CategoryModel, category_id)
        if category is None:
            raise CategoryNotFoundError(str(category_id))

        if data.slug is not None:
            category.slug = data.slug
        if data.name is not None:
            category.name = data.name
        if data.description is not None:
            category.description = data.description
        if data.clear_parent:
            category.parent_id = None
        elif data.parent_id is not None:
            category.parent_id = data.parent_id
        if data.is_active is not None:
            category.is_active = data.is_active
        if data.sort_order is not None:
            category.sort_order = data.sort_order

        try:
            await self._session.flush()
        except IntegrityError as exc:
            await self._session.rollback()
            self._raise_integrity(exc)

        return self._category_to_domain(category)

    @staticmethod
    def _raise_integrity(exc: IntegrityError) -> None:
        message = str(exc.orig).lower() if exc.orig else str(exc).lower()
        if "sku" in message:
            raise DuplicateSkuError() from exc
        raise DuplicateSlugError() from exc

    @staticmethod
    def _product_to_domain(row: ProductModel, *, include_variants: bool = False) -> Product:
        variants: tuple[ProductVariant, ...] = ()
        if include_variants:
            variants = tuple(
                AdminCatalogRepository._variant_to_domain(v) for v in row.variants
            )
        return Product(
            id=row.id,
            name=row.name,
            slug=row.slug,
            price_cents=row.price_cents,
            currency=row.currency,
            in_stock=row.in_stock,
            status=row.status,
            compare_at_price_cents=row.compare_at_price_cents,
            category_id=row.category_id,
            variants=variants,
        )

    @staticmethod
    def _variant_to_domain(row: ProductVariantModel) -> ProductVariant:
        return ProductVariant(
            id=row.id,
            product_id=row.product_id,
            sku=row.sku,
            name=row.name,
            price_cents=row.price_cents,
            wholesale_price_cents=row.wholesale_price_cents,
            in_stock=row.in_stock,
            is_default=row.is_default,
            sort_order=row.sort_order,
            attributes=dict(row.attributes or {}),
        )

    @staticmethod
    def _category_to_domain(row: CategoryModel) -> Category:
        return Category(
            id=row.id,
            slug=row.slug,
            name=row.name,
            description=row.description,
            parent_id=row.parent_id,
            is_active=row.is_active,
            sort_order=row.sort_order,
        )
