"""Catalog HTTP routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.features.catalog.application.use_cases.get_product import GetProductUseCase
from app.features.catalog.application.use_cases.list_products import ListProductsUseCase
from app.features.catalog.domain.ports import IProductRepository
from app.features.catalog.infrastructure.persistence.repository import ProductRepository
from app.features.catalog.presentation.schemas import ProductListResponse, ProductSchema

router = APIRouter(prefix="/products", tags=["catalog"])


def get_product_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IProductRepository:
    return ProductRepository(session)


@router.get("", response_model=ProductListResponse, operation_id="listProducts")
async def list_products(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None, description="Filter by primary category slug"),
    repo: IProductRepository = Depends(get_product_repository),
) -> ProductListResponse:
    use_case = ListProductsUseCase(repo)
    products, total = await use_case.execute(page=page, limit=limit, category_slug=category)
    return ProductListResponse(
        items=[ProductSchema.model_validate(p) for p in products],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{slug}", response_model=ProductSchema, operation_id="getProduct")
async def get_product(
    slug: str,
    repo: IProductRepository = Depends(get_product_repository),
) -> ProductSchema:
    use_case = GetProductUseCase(repo)
    product = await use_case.execute(slug)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductSchema.model_validate(product)
