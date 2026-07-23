"""Admin catalog HTTP routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.features.admin.domain.entities import AdminUser
from app.features.admin.presentation.dependencies import require_permission
from app.features.catalog.domain.admin_ports import (
    CategoryHasChildrenError,
    CategoryNotFoundError,
    InvalidCategoryParentError,
    CreateCategoryData,
    CreateVariantData,
    DuplicateSkuError,
    DuplicateSlugError,
    IAdminCatalogRepository,
    ProductNotFoundError,
    SyncProtectedFieldError,
    UpdateCategoryData,
    UpdateProductData,
    UpdateVariantData,
    VariantInventorySnapshot,
    VariantNotFoundError,
)
from app.features.catalog.domain.entities import Product, ProductVariant
from app.features.catalog.domain.merchandising_readiness import (
    format_publish_blockers_ru,
    get_moysklad_publish_blockers,
    should_validate_moysklad_publish,
)
from app.features.catalog.infrastructure.persistence.admin_catalog_repository import (
    AdminCatalogRepository,
)
from app.features.catalog.presentation.admin_schemas import (
    AdminCatalogOverviewResponse,
    AdminCategoryListResponse,
    AdminCreateCategoryRequest,
    AdminCreateProductImageRequest,
    AdminCreateProductRequest,
    AdminCreateVariantRequest,
    AdminProductListResponse,
    AdminProductSchema,
    AdminProductVariantSchema,
    AdminUpdateCategoryRequest,
    AdminUpdateProductImageRequest,
    AdminUpdateProductRequest,
    AdminUpdateVariantRequest,
    ProductImageSchema,
)
from app.features.catalog.presentation.schemas import CategorySchema, ProductVariantSchema
from app.features.catalog.infrastructure.persistence.product_image_repository import (
    ProductImageNotFoundError,
    ProductImageRepository,
)

router = APIRouter(prefix="/admin/catalog", tags=["admin"])


def get_admin_catalog_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IAdminCatalogRepository:
    return AdminCatalogRepository(session)


def get_product_image_repository(
    session: AsyncSession = Depends(get_db_session),
) -> ProductImageRepository:
    return ProductImageRepository(session)


async def _load_product_schema(
    product_id: UUID,
    repo: IAdminCatalogRepository,
    image_repo: ProductImageRepository,
) -> AdminProductSchema | None:
    product = await repo.get_product_by_id(product_id)
    if product is None:
        return None
    images = await image_repo.list_for_product(product_id)
    inventory = await repo.get_variant_inventory_snapshots(
        [variant.id for variant in product.variants]
    )
    return _product_schema(product, images, inventory)


def _variant_schema(
    variant: ProductVariant,
    inventory: dict[UUID, VariantInventorySnapshot],
) -> AdminProductVariantSchema:
    snapshot = inventory.get(variant.id)
    return AdminProductVariantSchema(
        id=variant.id,
        sku=variant.sku,
        name=variant.name,
        price_cents=variant.price_cents,
        wholesale_price_cents=variant.wholesale_price_cents,
        in_stock=variant.in_stock,
        is_default=variant.is_default,
        sort_order=variant.sort_order,
        attributes=variant.attributes,
        moysklad_variant_id=variant.moysklad_variant_id,
        barcode=variant.barcode,
        weight_grams=variant.weight_grams,
        dimensions_cm=variant.dimensions_cm,
        quantity_on_hand=snapshot.quantity_on_hand if snapshot else None,
        quantity_reserved=snapshot.quantity_reserved if snapshot else None,
        available=snapshot.available if snapshot else None,
    )


def _product_schema(
    product: Product,
    images: list | None = None,
    inventory: dict[UUID, VariantInventorySnapshot] | None = None,
) -> AdminProductSchema:
    inventory = inventory or {}
    variant_schemas = [_variant_schema(variant, inventory) for variant in product.variants]
    product_inventory = [
        inventory[variant.id]
        for variant in product.variants
        if variant.id in inventory
    ]
    stock_available_total = sum(snapshot.available for snapshot in product_inventory)
    stock_quantity_on_hand_total = sum(
        snapshot.quantity_on_hand for snapshot in product_inventory
    )
    low_stock_threshold = settings.admin_low_stock_threshold

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
        sync_source=product.sync_source,
        erp_name=product.erp_name,
        moysklad_product_id=product.moysklad_product_id,
        last_synced_at=product.last_synced_at.isoformat() if product.last_synced_at else None,
        meta_title=product.meta_title,
        meta_description=product.meta_description,
        erp_image_url=product.erp_image_url,
        images=[ProductImageSchema.model_validate(img) for img in (images or [])],
        variants=variant_schemas,
        stock_available_total=stock_available_total,
        stock_quantity_on_hand_total=stock_quantity_on_hand_total,
        is_low_stock=stock_available_total <= low_stock_threshold,
    )


@router.get(
    "/overview",
    response_model=AdminCatalogOverviewResponse,
    operation_id="adminCatalogOverview",
)
async def admin_catalog_overview(
    _admin: AdminUser = Depends(require_permission("admin:read")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
) -> AdminCatalogOverviewResponse:
    overview = await repo.get_catalog_overview()
    return AdminCatalogOverviewResponse(
        total=overview.total,
        uncategorized=overview.uncategorized,
        needs_styling=overview.needs_styling,
        needs_color_photos=overview.needs_color_photos,
        ready_to_publish=overview.ready_to_publish,
        draft=overview.draft,
        active=overview.active,
        archived=overview.archived,
    )


@router.get("/products", response_model=AdminProductListResponse, operation_id="adminListProducts")
async def admin_list_products(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    q: str | None = Query(default=None, max_length=200),
    category_id: UUID | None = Query(default=None),
    uncategorized: bool = Query(default=False),
    needs_styling: bool = Query(default=False),
    needs_color_photos: bool = Query(default=False),
    sync_source: str | None = Query(default=None),
    moysklad_pending: bool = Query(default=False),
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
        needs_styling=needs_styling,
        needs_color_photos=needs_color_photos,
        sync_source=sync_source,
        moysklad_pending=moysklad_pending,
    )
    variant_ids = [variant.id for product in products for variant in product.variants]
    inventory = await repo.get_variant_inventory_snapshots(variant_ids)
    return AdminProductListResponse(
        items=[_product_schema(p, inventory=inventory) for p in products],
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
) -> AdminProductSchema:
    raise HTTPException(
        status_code=403,
        detail="Товары создаются только через импорт из МойСклад.",
    )


@router.get(
    "/products/{product_id}",
    response_model=AdminProductSchema,
    operation_id="adminGetProduct",
)
async def admin_get_product(
    product_id: UUID,
    _admin: AdminUser = Depends(require_permission("admin:read")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
    image_repo: ProductImageRepository = Depends(get_product_image_repository),
) -> AdminProductSchema:
    schema = await _load_product_schema(product_id, repo, image_repo)
    if schema is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return schema


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
    image_repo: ProductImageRepository = Depends(get_product_image_repository),
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

    next_status = request.status if request.status is not None else existing.status
    if request.clear_category:
        next_category_id = None
    elif request.category_id is not None:
        next_category_id = request.category_id
    else:
        next_category_id = existing.category_id
    next_image_url = request.image_url if request.image_url is not None else existing.image_url

    if should_validate_moysklad_publish(
        sync_source=existing.sync_source,
        current_status=existing.status,
        next_status=next_status,
    ):
        images = await image_repo.list_for_product(product_id)
        blockers = get_moysklad_publish_blockers(
            category_id=next_category_id,
            image_url=next_image_url,
            gallery_image_count=len(images),
            variants=existing.variants,
            image_option_colors=[img.option_color for img in images],
        )
        if blockers:
            raise HTTPException(status_code=422, detail=format_publish_blockers_ru(blockers))

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
                meta_title=request.meta_title,
                meta_description=request.meta_description,
            ),
        )
    except ProductNotFoundError:
        raise HTTPException(status_code=404, detail="Product not found")
    except SyncProtectedFieldError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except DuplicateSlugError:
        raise HTTPException(status_code=409, detail="Slug already exists")
    await session.commit()
    images = await image_repo.list_for_product(product_id)
    inventory = await repo.get_variant_inventory_snapshots(
        [variant.id for variant in product.variants]
    )
    return _product_schema(product, images, inventory)


@router.get(
    "/products/{product_id}/images",
    response_model=list[ProductImageSchema],
    operation_id="adminListProductImages",
)
async def admin_list_product_images(
    product_id: UUID,
    _admin: AdminUser = Depends(require_permission("admin:read")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
    image_repo: ProductImageRepository = Depends(get_product_image_repository),
) -> list[ProductImageSchema]:
    product = await repo.get_product_by_id(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    images = await image_repo.list_for_product(product_id)
    return [ProductImageSchema.model_validate(img) for img in images]


@router.post(
    "/products/{product_id}/images",
    response_model=ProductImageSchema,
    status_code=201,
    operation_id="adminCreateProductImage",
)
async def admin_create_product_image(
    product_id: UUID,
    request: AdminCreateProductImageRequest,
    _admin: AdminUser = Depends(require_permission("catalog:write")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
    image_repo: ProductImageRepository = Depends(get_product_image_repository),
    session: AsyncSession = Depends(get_db_session),
) -> ProductImageSchema:
    product = await repo.get_product_by_id(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    row = await image_repo.create(
        product_id=product_id,
        url=request.url,
        alt_text=request.alt_text,
        option_color=request.option_color,
        sort_order=request.sort_order,
    )
    await session.commit()
    return ProductImageSchema.model_validate(row)


@router.patch(
    "/products/images/{image_id}",
    response_model=ProductImageSchema,
    operation_id="adminUpdateProductImage",
)
async def admin_update_product_image(
    image_id: UUID,
    request: AdminUpdateProductImageRequest,
    _admin: AdminUser = Depends(require_permission("catalog:write")),
    image_repo: ProductImageRepository = Depends(get_product_image_repository),
    session: AsyncSession = Depends(get_db_session),
) -> ProductImageSchema:
    try:
        row = await image_repo.update(
            image_id,
            url=request.url,
            alt_text=request.alt_text,
            option_color=request.option_color,
            sort_order=request.sort_order,
        )
    except ProductImageNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    await session.commit()
    return ProductImageSchema.model_validate(row)


@router.delete(
    "/products/images/{image_id}",
    status_code=204,
    operation_id="adminDeleteProductImage",
)
async def admin_delete_product_image(
    image_id: UUID,
    _admin: AdminUser = Depends(require_permission("catalog:write")),
    image_repo: ProductImageRepository = Depends(get_product_image_repository),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    try:
        await image_repo.delete(image_id)
    except ProductImageNotFoundError:
        raise HTTPException(status_code=404, detail="Image not found")
    await session.commit()


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
    except SyncProtectedFieldError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
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
    except SyncProtectedFieldError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
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


@router.delete(
    "/categories/{category_id}",
    status_code=204,
    operation_id="adminDeleteCategory",
)
async def admin_delete_category(
    category_id: UUID,
    _admin: AdminUser = Depends(require_permission("catalog:write")),
    repo: IAdminCatalogRepository = Depends(get_admin_catalog_repository),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    try:
        await repo.delete_category(category_id)
    except CategoryNotFoundError:
        raise HTTPException(status_code=404, detail="Category not found")
    except CategoryHasChildrenError:
        raise HTTPException(
            status_code=422,
            detail="Сначала удалите подкатегории.",
        )
    await session.commit()
