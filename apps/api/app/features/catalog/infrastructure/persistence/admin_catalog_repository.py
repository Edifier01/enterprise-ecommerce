"""Admin catalog repository — SQLAlchemy implementation."""

import uuid

from sqlalchemy import exists, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.catalog.domain.admin_ports import (
    CategoryHasChildrenError,
    CategoryNotFoundError,
    InvalidCategoryParentError,
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
from app.features.integrations.moysklad.domain.sync_guard import (
    UpdateProductDataLike,
    UpdateVariantDataLike,
    assert_product_update_allowed,
    assert_variant_create_allowed,
    assert_variant_update_allowed,
)
from app.features.catalog.domain.color_gallery_coverage import needs_color_photos
from app.features.catalog.domain.entities import Category, Product, ProductVariant
from app.features.catalog.infrastructure.persistence.models import (
    CategoryModel,
    ProductModel,
    ProductVariantModel,
)
from app.features.integrations.moysklad.infrastructure.persistence.models import ProductImageModel


class AdminCatalogRepository(IAdminCatalogRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_products(
        self,
        page: int,
        limit: int,
        status: str | None = None,
        q: str | None = None,
        category_id: uuid.UUID | None = None,
        uncategorized: bool = False,
        needs_styling: bool = False,
        needs_color_photos: bool = False,
        sync_source: str | None = None,
        moysklad_pending: bool = False,
    ) -> tuple[list[Product], int]:
        offset = (page - 1) * limit
        filters = []
        if needs_color_photos:
            color_photo_ids = await self._product_ids_needing_color_photos()
            if not color_photo_ids:
                return [], 0
            filters.append(ProductModel.id.in_(color_photo_ids))
        if status is not None:
            filters.append(ProductModel.status == status)
        if sync_source is not None:
            filters.append(ProductModel.sync_source == sync_source)
        if moysklad_pending:
            filters.append(ProductModel.sync_source == "moysklad")
            filters.append(ProductModel.category_id.is_(None))
        if needs_styling:
            filters.append(ProductModel.status == "draft")
            filters.append(
                or_(
                    ProductModel.image_url.is_(None),
                    ProductModel.image_url == "",
                )
            )
            filters.append(
                ~exists(
                    select(1).where(ProductImageModel.product_id == ProductModel.id)
                )
            )
        if q is not None and q.strip():
            filters.append(self._admin_search_filter(q.strip()))
        if uncategorized:
            filters.append(ProductModel.category_id.is_(None))
        elif category_id is not None:
            filters.append(ProductModel.category_id == category_id)

        count_stmt = select(func.count()).select_from(ProductModel)
        stmt = (
            select(ProductModel)
            .options(selectinload(ProductModel.variants))
            .order_by(ProductModel.updated_at.desc())
        )
        if filters:
            count_stmt = count_stmt.where(*filters)
            stmt = stmt.where(*filters)

        total = int((await self._session.scalar(count_stmt)) or 0)
        rows = (
            await self._session.scalars(stmt.offset(offset).limit(limit))
        ).all()
        return [self._product_to_domain(row, include_variants=True) for row in rows], total

    async def count_needs_color_photos(self) -> int:
        return len(await self._product_ids_needing_color_photos())

    async def _product_ids_needing_color_photos(self) -> list[uuid.UUID]:
        product_rows = (
            await self._session.scalars(
                select(ProductModel.id).order_by(ProductModel.updated_at.desc())
            )
        ).all()
        if not product_rows:
            return []

        product_ids = list(product_rows)
        variants_by_product: dict[uuid.UUID, list[ProductVariant]] = {
            product_id: [] for product_id in product_ids
        }
        variant_rows = (
            await self._session.scalars(
                select(ProductVariantModel).where(
                    ProductVariantModel.product_id.in_(product_ids)
                )
            )
        ).all()
        for row in variant_rows:
            variants_by_product[row.product_id].append(self._variant_to_domain(row))

        image_colors_by_product: dict[uuid.UUID, list[str | None]] = {
            product_id: [] for product_id in product_ids
        }
        image_rows = (
            await self._session.scalars(
                select(ProductImageModel).where(
                    ProductImageModel.product_id.in_(product_ids)
                )
            )
        ).all()
        for row in image_rows:
            image_colors_by_product[row.product_id].append(row.option_color)

        return [
            product_id
            for product_id in product_ids
            if needs_color_photos(
                variants_by_product[product_id],
                image_colors_by_product[product_id],
            )
        ]

    @staticmethod
    def _admin_search_filter(query: str):
        term = f"%{query.casefold()}%"
        name_match = func.lower(ProductModel.name).like(term)
        slug_match = func.lower(ProductModel.slug).like(term)
        sku_match = exists(
            select(1).where(
                ProductVariantModel.product_id == ProductModel.id,
                func.lower(ProductVariantModel.sku).like(term),
            )
        )
        return or_(name_match, slug_match, sku_match)

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
            description=data.description,
            image_url=data.image_url,
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

        assert_product_update_allowed(
            product.sync_source,
            UpdateProductDataLike(price_cents=data.price_cents, currency=data.currency),
        )

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
        if data.description is not None:
            product.description = data.description
        if data.image_url is not None:
            product.image_url = data.image_url
        if data.meta_title is not None:
            product.meta_title = data.meta_title
        if data.meta_description is not None:
            product.meta_description = data.meta_description

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

        assert_variant_create_allowed(product.sync_source)

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

        product = await self._session.get(ProductModel, variant.product_id)
        sync_source = product.sync_source if product is not None else "manual"
        assert_variant_update_allowed(
            sync_source,
            UpdateVariantDataLike(
                sku=data.sku,
                price_cents=data.price_cents,
                wholesale_price_cents=data.wholesale_price_cents,
                attributes=data.attributes,
            ),
        )

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
        counts_stmt = (
            select(ProductModel.category_id, func.count())
            .where(
                ProductModel.status == "active",
                ProductModel.category_id.is_not(None),
                ProductModel.sync_source == "moysklad",
            )
            .group_by(ProductModel.category_id)
        )
        count_rows = await self._session.execute(counts_stmt)
        product_counts = {row[0]: int(row[1]) for row in count_rows}

        stmt = select(CategoryModel).order_by(CategoryModel.sort_order, CategoryModel.name)
        rows = (await self._session.scalars(stmt)).all()
        return [
            self._category_to_domain(row, product_count=product_counts.get(row.id, 0))
            for row in rows
        ]

    async def get_category_by_id(self, category_id: uuid.UUID) -> Category | None:
        row = await self._session.get(CategoryModel, category_id)
        return self._category_to_domain(row) if row is not None else None

    async def _validate_category_parent(
        self,
        parent_id: uuid.UUID | None,
        *,
        category_id: uuid.UUID | None = None,
    ) -> None:
        if parent_id is None:
            return

        if category_id is not None and parent_id == category_id:
            raise InvalidCategoryParentError()

        parent = await self._session.get(CategoryModel, parent_id)
        if parent is None:
            raise CategoryNotFoundError(str(parent_id))

        if parent.parent_id is not None:
            raise InvalidCategoryParentError()

        if category_id is not None:
            child_count = await self._session.scalar(
                select(func.count())
                .select_from(CategoryModel)
                .where(CategoryModel.parent_id == category_id)
            )
            if int(child_count or 0) > 0:
                raise InvalidCategoryParentError()

    async def create_category(self, data: CreateCategoryData) -> Category:
        await self._validate_category_parent(data.parent_id)
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
            await self._validate_category_parent(
                data.parent_id,
                category_id=category_id,
            )
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

    async def delete_category(self, category_id: uuid.UUID) -> None:
        category = await self._session.get(CategoryModel, category_id)
        if category is None:
            raise CategoryNotFoundError(str(category_id))

        child_count = await self._session.scalar(
            select(func.count())
            .select_from(CategoryModel)
            .where(CategoryModel.parent_id == category_id)
        )
        if child_count and child_count > 0:
            raise CategoryHasChildrenError(str(category_id))

        await self._session.execute(
            update(ProductModel)
            .where(ProductModel.category_id == category_id)
            .values(category_id=None)
        )
        await self._session.delete(category)
        await self._session.flush()

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
            description=row.description,
            image_url=row.image_url,
            sync_source=row.sync_source,
            erp_name=row.erp_name,
            moysklad_product_id=row.moysklad_product_id,
            last_synced_at=row.last_synced_at,
            meta_title=row.meta_title,
            meta_description=row.meta_description,
            erp_image_url=row.erp_image_url,
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
            moysklad_variant_id=row.moysklad_variant_id,
            barcode=row.barcode,
            weight_grams=row.weight_grams,
            dimensions_cm=dict(row.dimensions_cm) if row.dimensions_cm else None,
        )

    @staticmethod
    def _category_to_domain(row: CategoryModel, *, product_count: int = 0) -> Category:
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
