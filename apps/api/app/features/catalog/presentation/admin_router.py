"""Admin catalog HTTP routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.features.admin.domain.entities import AdminUser
from app.features.admin.presentation.dependencies import require_permission
from app.features.catalog.domain.admin_ports import (
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
from app.features.catalog.domain.entities import Product
from app.features.catalog.infrastructure.persistence.admin_catalog_repository import (
    AdminCatalogRepository,
)
from app.features.catalog.presentation.admin_schemas import (
    AdminCategoryListResponse,
    AdminCreateCategoryRequest,
    AdminCreateProductRequest,
    AdminCreateVariantRequest,
    AdminProductListResponse,
    AdminProductSchema,
    AdminUpdateCategoryRequest,
    AdminUpdateProductRequest,
    AdminUpdateVariantRequest,
)
from app.features.catalog.presentation.schemas import CategorySchema, ProductVariantSchema

router = APIRouter(prefix="/admin/catalog", tags=["admin"])


def get_admin_catalog_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IAdminCatalogRepository:
    return AdminCatalogRepository(session)


def _product_schema(product: Product) -> AdminProductSchema:
    return AdminProductSchema(
        id=product.id,
        name=product.name,
        slug=product.slug,
        price_cents=product.price_cents,
        compare_at_price_cents=product.compare_at_price_cents,
        currency=product.currency,
        in_stock=product.in_stock,
        status=product.status,
        category_id=product.category_id,
        description=product.description,
        image_url=product.image_url,
        variants=[ProductVariantSchema.model_validate(v) for v in product.variants],
    )


@router.get("/products", response_model=AdminProductListResponse, operation_id="adminListProducts")
async def admin_list_products(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    q: str | None = Query(default=None, max_length=200),
    category_id: UUID | None = Query(default=None),
    uncategorized: bool = Query(default=False),
    _admin: AdminUser = Depends(require_permission("admin:read")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
) -> AdminProductListResponse:
    products, total = await repo.list_products(
        page=page,
        limit=limit,
        status=status,
        q=q,
        category_id=category_id,
        uncategorized=uncategorized,
    )
    return AdminProductListResponse(
        items=[_product_schema(p) for p in products],
        total=total,
        page=page,
        limit=limit,
    )


@router.post(
    "/products",
    response_model=AdminProductSchema,
    status_code=201,
    operation_id="adminCreateProduct",
)
async def admin_create_product(
    request: AdminCreateProductRequest,
    _admin: AdminUser = Depends(require_permission("catalog:write")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
    session: AsyncSession = Depends(get_db_session),
) -> AdminProductSchema:
    if (
        request.compare_at_price_cents is not None
        and request.compare_at_price_cents <= request.price_cents
    ):
        raise HTTPException(
            status_code=422,
            detail="compare_at_price_cents must be greater than price_cents",
        )
    if (
        request.wholesale_price_cents is not None
        and request.wholesale_price_cents > request.price_cents
    ):
        raise HTTPException(
            status_code=422,
            detail="wholesale_price_cents must not exceed price_cents",
        )
    try:
        product = await repo.create_product(
            CreateProductData(
                name=request.name.strip(),
                slug=request.slug,
                sku=request.sku,
                price_cents=request.price_cents,
                currency=request.currency.upper(),
                status=request.status,
                compare_at_price_cents=request.compare_at_price_cents,
                category_id=request.category_id,
                wholesale_price_cents=request.wholesale_price_cents,
                description=request.description,
                image_url=request.image_url,
            )
        )
    except DuplicateSlugError:
        raise HTTPException(status_code=409, detail="Slug already exists")
    except DuplicateSkuError:
        raise HTTPException(status_code=409, detail="SKU already exists")
    await session.commit()
    return _product_schema(product)


@router.get(
    "/products/{product_id}",
    response_model=AdminProductSchema,
    operation_id="adminGetProduct",
)
async def admin_get_product(
    product_id: UUID,
    _admin: AdminUser = Depends(require_permission("admin:read")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
) -> AdminProductSchema:
    product = await repo.get_product_by_id(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return _product_schema(product)


@router.patch(
    "/products/{product_id}",
    response_model=AdminProductSchema,
    operation_id="adminUpdateProduct",
)
async def admin_update_product(
    product_id: UUID,
    request: AdminUpdateProductRequest,
    _admin: AdminUser = Depends(require_permission("catalog:write")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
    session: AsyncSession = Depends(get_db_session),
) -> AdminProductSchema:
    existing = await repo.get_product_by_id(product_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Product not found")

    next_price = request.price_cents if request.price_cents is not None else existing.price_cents
    next_compare = (
        request.compare_at_price_cents
        if request.compare_at_price_cents is not None
        else existing.compare_at_price_cents
    )
    if next_compare is not None and next_compare <= next_price:
        raise HTTPException(
            status_code=422,
            detail="compare_at_price_cents must be greater than price_cents",
        )

    try:
        product = await repo.update_product(
            product_id,
            UpdateProductData(
                name=request.name.strip() if request.name is not None else None,
                slug=request.slug,
                price_cents=request.price_cents,
                currency=request.currency.upper() if request.currency else None,
                status=request.status,
                compare_at_price_cents=request.compare_at_price_cents,
                category_id=request.category_id,
                clear_category=request.clear_category,
                description=request.description,
                image_url=request.image_url,
            ),
        )
    except ProductNotFoundError:
        raise HTTPException(status_code=404, detail="Product not found")
    except DuplicateSlugError:
        raise HTTPException(status_code=409, detail="Slug already exists")
    await session.commit()
    return _product_schema(product)


@router.post(
    "/products/{product_id}/variants",
    response_model=ProductVariantSchema,
    status_code=201,
    operation_id="adminCreateVariant",
)
async def admin_create_variant(
    product_id: UUID,
    request: AdminCreateVariantRequest,
    _admin: AdminUser = Depends(require_permission("catalog:write")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
    session: AsyncSession = Depends(get_db_session),
) -> ProductVariantSchema:
    try:
        variant = await repo.create_variant(
            CreateVariantData(
                product_id=product_id,
                sku=request.sku,
                name=request.name.strip(),
                price_cents=request.price_cents,
                wholesale_price_cents=request.wholesale_price_cents,
                is_default=request.is_default,
                sort_order=request.sort_order,
                attributes=request.attributes,
            )
        )
    except ProductNotFoundError:
        raise HTTPException(status_code=404, detail="Product not found")
    except DuplicateSkuError:
        raise HTTPException(status_code=409, detail="SKU already exists")
    await session.commit()
    return ProductVariantSchema.model_validate(variant)


@router.patch(
    "/variants/{variant_id}",
    response_model=ProductVariantSchema,
    operation_id="adminUpdateVariant",
)
async def admin_update_variant(
    variant_id: UUID,
    request: AdminUpdateVariantRequest,
    _admin: AdminUser = Depends(require_permission("catalog:write")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
    session: AsyncSession = Depends(get_db_session),
) -> ProductVariantSchema:
    try:
        variant = await repo.update_variant(
            variant_id,
            UpdateVariantData(
                sku=request.sku,
                name=request.name.strip() if request.name is not None else None,
                price_cents=request.price_cents,
                wholesale_price_cents=request.wholesale_price_cents,
                is_default=request.is_default,
                sort_order=request.sort_order,
                attributes=request.attributes,
            ),
        )
    except VariantNotFoundError:
        raise HTTPException(status_code=404, detail="Variant not found")
    except DuplicateSkuError:
        raise HTTPException(status_code=409, detail="SKU already exists")
    await session.commit()
    return ProductVariantSchema.model_validate(variant)


@router.get("/categories", response_model=AdminCategoryListResponse, operation_id="adminListCategories")
async def admin_list_categories(
    _admin: AdminUser = Depends(require_permission("admin:read")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
) -> AdminCategoryListResponse:
    categories = await repo.list_categories()
    return AdminCategoryListResponse(
        items=[CategorySchema.model_validate(c) for c in categories],
        total=len(categories),
    )


@router.post(
    "/categories",
    response_model=CategorySchema,
    status_code=201,
    operation_id="adminCreateCategory",
)
async def admin_create_category(
    request: AdminCreateCategoryRequest,
    _admin: AdminUser = Depends(require_permission("catalog:write")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
    session: AsyncSession = Depends(get_db_session),
) -> CategorySchema:
    try:
        category = await repo.create_category(
            CreateCategoryData(
                slug=request.slug,
                name=request.name.strip(),
                description=request.description,
                parent_id=request.parent_id,
                is_active=request.is_active,
                sort_order=request.sort_order,
            )
        )
    except DuplicateSlugError:
        raise HTTPException(status_code=409, detail="Slug already exists")
    except CategoryNotFoundError:
        raise HTTPException(status_code=404, detail="Parent category not found")
    except InvalidCategoryParentError:
        raise HTTPException(
            status_code=422,
            detail="Parent must be a root category; roots with subcategories cannot become subcategories",
        )
    await session.commit()
    return CategorySchema.model_validate(category)


@router.patch(
    "/categories/{category_id}",
    response_model=CategorySchema,
    operation_id="adminUpdateCategory",
)
async def admin_update_category(
    category_id: UUID,
    request: AdminUpdateCategoryRequest,
    _admin: AdminUser = Depends(require_permission("catalog:write")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
    session: AsyncSession = Depends(get_db_session),
) -> CategorySchema:
    try:
        category = await repo.update_category(
            category_id,
            UpdateCategoryData(
                slug=request.slug,
                name=request.name.strip() if request.name is not None else None,
                description=request.description,
                parent_id=request.parent_id,
                clear_parent=request.clear_parent,
                is_active=request.is_active,
                sort_order=request.sort_order,
            ),
        )
    except CategoryNotFoundError:
        raise HTTPException(status_code=404, detail="Category not found")
    except DuplicateSlugError:
        raise HTTPException(status_code=409, detail="Slug already exists")
    except InvalidCategoryParentError:
        raise HTTPException(
            status_code=422,
            detail="Parent must be a root category; roots with subcategories cannot become subcategories",
        )
    await session.commit()
    return CategorySchema.model_validate(category)
