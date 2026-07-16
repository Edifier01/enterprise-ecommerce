"""Product repository — SQLAlchemy implementation of IProductRepository."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import case, exists, func, or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.catalog.domain.entities import Product, ProductVariant
from dataclasses import replace

from app.features.catalog.domain.product_list_filters import ProductListFacets, ProductListFilters
from app.features.catalog.domain.ports import IProductRepository
from app.features.catalog.domain.variant_filter import (
    build_facets_from_products,
    build_facets_with_scoped_products,
)
from app.features.catalog.infrastructure.persistence.models import (
    CategoryModel,
    ProductModel,
    ProductVariantModel,
)
from app.features.checkout.infrastructure.persistence.models import OrderLineModel, OrderModel

_ACTIVE_STATUS = "active"
_FACET_SCAN_LIMIT = 5000
_POPULAR_ORDER_STATUSES = ("confirmed", "shipped")
_POPULAR_LOOKBACK_DAYS = 90


class ProductRepository(IProductRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_products(
        self,
        page: int,
        limit: int,
        filters: ProductListFilters | None = None,
    ) -> tuple[list[Product], int]:
        filters = filters or ProductListFilters()
        offset = (page - 1) * limit

        count_stmt = select(func.count()).select_from(ProductModel).where(
            ProductModel.status == _ACTIVE_STATUS
        )
        stmt = (
            select(ProductModel)
            .where(ProductModel.status == _ACTIVE_STATUS)
            .options(selectinload(ProductModel.variants))
        )

        count_stmt, stmt = self._apply_filters(count_stmt, stmt, filters)

        total = int((await self._session.scalar(count_stmt)) or 0)
        if filters.sort == "popular":
            stmt = self._apply_popular_sort(stmt)
        else:
            stmt = self._apply_sort(stmt, filters.sort)
        stmt = stmt.offset(offset).limit(limit)
        rows = (await self._session.scalars(stmt)).all()
        products = [self._to_domain(row, include_variants=True) for row in rows]
        return products, total

    async def get_product_facets(
        self,
        category_slug: str | None = None,
        search_query: str | None = None,
        filters: ProductListFilters | None = None,
    ) -> ProductListFacets:
        base_filters = filters or ProductListFilters()
        if category_slug is not None and base_filters.category_slug is None:
            base_filters = replace(base_filters, category_slug=category_slug)

        if not base_filters.sizes and not base_filters.colors:
            products = await self._load_facet_products(search_query, base_filters)
            return build_facets_from_products(products)

        size_products = await self._load_facet_products(
            search_query,
            replace(base_filters, sizes=()),
        )
        color_products = await self._load_facet_products(
            search_query,
            replace(base_filters, colors=()),
        )
        price_products = await self._load_facet_products(search_query, base_filters)

        return build_facets_with_scoped_products(
            size_products=size_products,
            color_products=color_products,
            price_products=price_products,
        )

    async def _load_facet_products(
        self,
        search_query: str | None,
        filters: ProductListFilters,
    ) -> list[Product]:
        count_stmt = select(func.count()).select_from(ProductModel).where(
            ProductModel.status == _ACTIVE_STATUS
        )
        stmt = (
            select(ProductModel)
            .where(ProductModel.status == _ACTIVE_STATUS)
            .options(selectinload(ProductModel.variants))
        )

        if search_query:
            search_filter = self._search_filter(search_query)
            count_stmt = count_stmt.where(search_filter)
            stmt = stmt.where(search_filter)

        count_stmt, stmt = self._apply_filters(count_stmt, stmt, filters)
        stmt = stmt.limit(_FACET_SCAN_LIMIT)
        rows = (await self._session.scalars(stmt)).all()
        return [self._to_domain(row, include_variants=True) for row in rows]

    async def search_products(
        self,
        query: str,
        page: int,
        limit: int,
        filters: ProductListFilters | None = None,
    ) -> tuple[list[Product], int]:
        filters = filters or ProductListFilters()
        offset = (page - 1) * limit
        search_filter = self._search_filter(query)
        relevance = self._search_relevance(query)

        count_stmt = (
            select(func.count())
            .select_from(ProductModel)
            .where(search_filter, ProductModel.status == _ACTIVE_STATUS)
        )
        stmt = (
            select(ProductModel)
            .where(search_filter, ProductModel.status == _ACTIVE_STATUS)
            .options(selectinload(ProductModel.variants))
        )

        count_stmt, stmt = self._apply_filters(count_stmt, stmt, filters)

        total = int((await self._session.scalar(count_stmt)) or 0)

        if filters.sort == "default":
            stmt = stmt.order_by(relevance, ProductModel.name.asc())
        elif filters.sort == "popular":
            stmt = self._apply_popular_sort(stmt)
        else:
            stmt = self._apply_sort(stmt, filters.sort)

        stmt = stmt.offset(offset).limit(limit)
        rows = (await self._session.scalars(stmt)).all()
        products = [self._to_domain(row, include_variants=True) for row in rows]
        return products, total

    async def get_by_slug(self, slug: str) -> Product | None:
        stmt = (
            select(ProductModel)
            .where(ProductModel.slug == slug, ProductModel.status == _ACTIVE_STATUS)
            .options(selectinload(ProductModel.variants))
        )
        row = (await self._session.scalars(stmt)).first()
        if row is None:
            return None
        return self._to_domain(row, include_variants=True)

    @staticmethod
    def _search_filter(query: str):
        term = f"%{query.casefold()}%"
        name_match = func.lower(ProductModel.name).like(term)
        sku_match = exists(
            select(1).where(
                ProductVariantModel.product_id == ProductModel.id,
                func.lower(ProductVariantModel.sku).like(term),
            )
        )
        return or_(name_match, sku_match)

    @staticmethod
    def _search_relevance(query: str):
        return case(
            (func.lower(ProductModel.name) == query.casefold(), 0),
            (func.lower(ProductModel.name).like(f"{query.casefold()}%"), 1),
            else_=2,
        )

    def _apply_filters(self, count_stmt, stmt, filters: ProductListFilters):
        if filters.category_slug is not None:
            category_filter = ProductModel.category_id.in_(
                select(CategoryModel.id).where(CategoryModel.slug == filters.category_slug)
            )
            count_stmt = count_stmt.where(category_filter)
            stmt = stmt.where(category_filter)

        if filters.in_stock_only:
            count_stmt = count_stmt.where(ProductModel.in_stock.is_(True))
            stmt = stmt.where(ProductModel.in_stock.is_(True))

        if filters.on_sale_only:
            sale_filter = (
                ProductModel.compare_at_price_cents.is_not(None)
                & (ProductModel.compare_at_price_cents > ProductModel.price_cents)
            )
            count_stmt = count_stmt.where(sale_filter)
            stmt = stmt.where(sale_filter)

        if filters.price_min_cents is not None:
            count_stmt = count_stmt.where(
                ProductModel.price_cents >= filters.price_min_cents
            )
            stmt = stmt.where(ProductModel.price_cents >= filters.price_min_cents)

        if filters.price_max_cents is not None:
            count_stmt = count_stmt.where(
                ProductModel.price_cents <= filters.price_max_cents
            )
            stmt = stmt.where(ProductModel.price_cents <= filters.price_max_cents)

        if filters.sizes:
            variant_exists = self._build_variant_exists(
                self._size_conditions(filters.sizes),
            )
            count_stmt = count_stmt.where(variant_exists)
            stmt = stmt.where(variant_exists)

        if filters.colors:
            variant_exists = self._build_variant_exists(
                self._color_conditions(filters.colors),
            )
            count_stmt = count_stmt.where(variant_exists)
            stmt = stmt.where(variant_exists)

        return count_stmt, stmt

    @staticmethod
    def _build_variant_exists(conditions: list):
        if not conditions:
            return exists(select(1).where(False))
        return exists(
            select(1).where(
                ProductVariantModel.product_id == ProductModel.id,
                or_(*conditions),
            )
        )

    @staticmethod
    def _size_conditions(sizes: tuple[str, ...]) -> list:
        conditions = []
        for size in sizes:
            per_size = [
                ProductVariantModel.attributes["size"].as_string() == size,
                ProductVariantModel.name == size,
            ]
            if size.startswith("W") and size[1:].isdigit():
                per_size.append(
                    ProductVariantModel.attributes["waist"].as_string() == size[1:]
                )
            conditions.append(or_(*per_size))
        return conditions

    @staticmethod
    def _color_conditions(colors: tuple[str, ...]) -> list:
        conditions = []
        for color in colors:
            lowered = color.casefold()
            conditions.append(
                or_(
                    func.lower(ProductVariantModel.attributes["color"].as_string())
                    == lowered,
                    func.lower(
                        ProductVariantModel.attributes["camouflage"].as_string()
                    )
                    == lowered,
                )
            )
        return conditions

    def _product_sales_subquery(self):
        since = datetime.now(UTC) - timedelta(days=_POPULAR_LOOKBACK_DAYS)
        return (
            select(
                ProductVariantModel.product_id.label("product_id"),
                func.coalesce(func.sum(OrderLineModel.quantity), 0).label("sales_score"),
            )
            .select_from(OrderLineModel)
            .join(OrderModel, OrderLineModel.order_id == OrderModel.id)
            .join(ProductVariantModel, OrderLineModel.variant_id == ProductVariantModel.id)
            .where(
                OrderModel.status.in_(_POPULAR_ORDER_STATUSES),
                OrderModel.created_at >= since,
            )
            .group_by(ProductVariantModel.product_id)
            .subquery()
        )

    def _apply_popular_sort(self, stmt):
        sales_sq = self._product_sales_subquery()
        return (
            stmt.outerjoin(sales_sq, ProductModel.id == sales_sq.c.product_id)
            .order_by(
                func.coalesce(sales_sq.c.sales_score, 0).desc(),
                ProductModel.created_at.desc(),
            )
        )

    @staticmethod
    def _apply_sort(stmt, sort: str):
        if sort == "popular":
            return stmt.order_by(ProductModel.created_at.desc())
        match sort:
            case "price_asc":
                return stmt.order_by(ProductModel.price_cents.asc(), ProductModel.name.asc())
            case "price_desc":
                return stmt.order_by(ProductModel.price_cents.desc(), ProductModel.name.asc())
            case "name_asc":
                return stmt.order_by(ProductModel.name.asc())
            case "name_desc":
                return stmt.order_by(ProductModel.name.desc())
            case _:
                return stmt.order_by(ProductModel.created_at.desc())

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
                    wholesale_price_cents=v.wholesale_price_cents,
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
            status=row.status,
            compare_at_price_cents=row.compare_at_price_cents,
            category_id=row.category_id,
            description=row.description,
            image_url=row.image_url,
            variants=variants,
        )
