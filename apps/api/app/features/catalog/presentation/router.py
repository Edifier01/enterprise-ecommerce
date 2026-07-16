"""Catalog HTTP routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.features.auth.domain.entities import User
from app.features.auth.presentation.dependencies import get_optional_current_user
from app.features.catalog.application.use_cases.get_product import GetProductUseCase
from app.features.catalog.application.use_cases.get_product_facets import GetProductFacetsUseCase
from app.features.catalog.application.use_cases.list_products import ListProductsUseCase
from app.features.catalog.application.use_cases.search_products import SearchProductsUseCase
from app.features.catalog.domain.product_list_filters import ProductListFilters, ProductSortOption
from app.features.catalog.domain.ports import IProductRepository
from app.features.catalog.infrastructure.persistence.repository import ProductRepository
from app.features.catalog.presentation.schemas import (
    ProductFacetsResponse,
    ProductListResponse,
    ProductSchema,
)
from app.features.catalog.presentation.serializers import product_to_schema

router = APIRouter(prefix="/products", tags=["catalog"])

_SORT_OPTIONS: set[str] = {
    "default",
    "popular",
    "price_asc",
    "price_desc",
    "name_asc",
    "name_desc",
}


def get_product_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IProductRepository:
    return ProductRepository(session)


def _show_wholesale(user: User | None) -> bool:
    return user is not None and user.is_wholesaler


def _build_filters(
    *,
    category: str | None,
    in_stock: bool | None,
    on_sale: bool | None,
    size: list[str],
    color: list[str],
    price_min: int | None,
    price_max: int | None,
    sort: str,
) -> ProductListFilters:
    sort_value: ProductSortOption = (
        sort if sort in _SORT_OPTIONS else "default"  # type: ignore[assignment]
    )
    return ProductListFilters(
        category_slug=category,
        in_stock_only=in_stock is True,
        on_sale_only=on_sale is True,
        sizes=tuple(size),
        colors=tuple(color),
        price_min_cents=price_min,
        price_max_cents=price_max,
        sort=sort_value,
    )


@router.get(
    "/facets",
    response_model=ProductFacetsResponse,
    operation_id="getProductFacets",
)
async def get_product_facets(
    category: str | None = Query(default=None, description="Scope facets to category slug"),
    q: str | None = Query(
        default=None,
        min_length=1,
        max_length=100,
        description="Scope facets to search query",
    ),
    in_stock: bool | None = Query(default=None, description="When true, only in-stock products"),
    on_sale: bool | None = Query(default=None, description="When true, only discounted products"),
    size: list[str] = Query(default=[], description="Filter by variant size (repeatable)"),
    color: list[str] = Query(default=[], description="Filter by variant color/camouflage"),
    price_min: int | None = Query(default=None, ge=0, description="Minimum price in cents"),
    price_max: int | None = Query(default=None, ge=0, description="Maximum price in cents"),
    repo: IProductRepository = Depends(get_product_repository),
) -> ProductFacetsResponse:
    filters = _build_filters(
        category=category,
        in_stock=in_stock,
        on_sale=on_sale,
        size=size,
        color=color,
        price_min=price_min,
        price_max=price_max,
        sort="default",
    )
    use_case = GetProductFacetsUseCase(repo)
    facets = await use_case.execute(
        category_slug=category,
        search_query=q,
        filters=filters,
    )
    return ProductFacetsResponse(
        sizes=list(facets.sizes),
        colors=list(facets.colors),
        price_min_cents=facets.price_min_cents,
        price_max_cents=facets.price_max_cents,
        size_counts=dict(facets.size_counts),
        color_counts=dict(facets.color_counts),
    )


@router.get("", response_model=ProductListResponse, response_model_exclude_none=True, operation_id="listProducts")
async def list_products(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None, description="Filter by primary category slug"),
    in_stock: bool | None = Query(default=None, description="When true, only in-stock products"),
    on_sale: bool | None = Query(default=None, description="When true, only discounted products"),
    size: list[str] = Query(default=[], description="Filter by variant size (repeatable)"),
    color: list[str] = Query(default=[], description="Filter by variant color/camouflage"),
    price_min: int | None = Query(default=None, ge=0, description="Minimum price in cents"),
    price_max: int | None = Query(default=None, ge=0, description="Maximum price in cents"),
    sort: str = Query(
        default="default",
        description="Sort order (popular = best sellers by quantity in last 90 days)",
    ),
    repo: IProductRepository = Depends(get_product_repository),
    user: User | None = Depends(get_optional_current_user),
) -> ProductListResponse:
    filters = _build_filters(
        category=category,
        in_stock=in_stock,
        on_sale=on_sale,
        size=size,
        color=color,
        price_min=price_min,
        price_max=price_max,
        sort=sort,
    )
    use_case = ListProductsUseCase(repo)
    products, total = await use_case.execute(page=page, limit=limit, filters=filters)
    show_wholesale = _show_wholesale(user)
    return ProductListResponse(
        items=[product_to_schema(p, show_wholesale=show_wholesale) for p in products],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/search", response_model=ProductListResponse, response_model_exclude_none=True, operation_id="searchProducts")
async def search_products(
    q: str = Query(min_length=1, max_length=100, description="Search by product name or SKU"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=24, ge=1, le=100),
    in_stock: bool | None = Query(default=None, description="When true, only in-stock products"),
    on_sale: bool | None = Query(default=None, description="When true, only discounted products"),
    size: list[str] = Query(default=[], description="Filter by variant size (repeatable)"),
    color: list[str] = Query(default=[], description="Filter by variant color/camouflage"),
    price_min: int | None = Query(default=None, ge=0, description="Minimum price in cents"),
    price_max: int | None = Query(default=None, ge=0, description="Maximum price in cents"),
    sort: str = Query(default="default", description="Sort order (default = relevance)"),
    repo: IProductRepository = Depends(get_product_repository),
    user: User | None = Depends(get_optional_current_user),
) -> ProductListResponse:
    filters = _build_filters(
        category=None,
        in_stock=in_stock,
        on_sale=on_sale,
        size=size,
        color=color,
        price_min=price_min,
        price_max=price_max,
        sort=sort,
    )
    use_case = SearchProductsUseCase(repo)
    products, total = await use_case.execute(query=q, page=page, limit=limit, filters=filters)
    show_wholesale = _show_wholesale(user)
    return ProductListResponse(
        items=[product_to_schema(p, show_wholesale=show_wholesale) for p in products],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{slug}", response_model=ProductSchema, response_model_exclude_none=True, operation_id="getProduct")
async def get_product(
    slug: str,
    repo: IProductRepository = Depends(get_product_repository),
    user: User | None = Depends(get_optional_current_user),
) -> ProductSchema:
    use_case = GetProductUseCase(repo)
    product = await use_case.execute(slug)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_to_schema(product, show_wholesale=_show_wholesale(user))
