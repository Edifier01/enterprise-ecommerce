"""Catalog HTTP routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.features.auth.domain.entities import User
from app.features.auth.presentation.dependencies import get_optional_current_user
from app.features.catalog.application.use_cases.get_product import GetProductUseCase
from app.features.catalog.application.use_cases.list_products import ListProductsUseCase
from app.features.catalog.application.use_cases.search_products import SearchProductsUseCase
from app.features.catalog.domain.ports import IProductRepository
from app.features.catalog.infrastructure.persistence.repository import ProductRepository
from app.features.catalog.presentation.schemas import ProductListResponse, ProductSchema
from app.features.catalog.presentation.serializers import product_to_schema

router = APIRouter(prefix="/products", tags=["catalog"])


def get_product_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IProductRepository:
    return ProductRepository(session)


def _show_wholesale(user: User | None) -> bool:
    return user is not None and user.is_wholesaler


@router.get("", response_model=ProductListResponse, response_model_exclude_none=True, operation_id="listProducts")
async def list_products(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None, description="Filter by primary category slug"),
    repo: IProductRepository = Depends(get_product_repository),
    user: User | None = Depends(get_optional_current_user),
) -> ProductListResponse:
    use_case = ListProductsUseCase(repo)
    products, total = await use_case.execute(page=page, limit=limit, category_slug=category)
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
    repo: IProductRepository = Depends(get_product_repository),
    user: User | None = Depends(get_optional_current_user),
) -> ProductListResponse:
    use_case = SearchProductsUseCase(repo)
    products, total = await use_case.execute(query=q, page=page, limit=limit)
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
