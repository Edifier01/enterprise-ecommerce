"""Admin MoySklad integration routes — inbound sync only, never writes to MoySklad."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.features.admin.domain.entities import AdminUser
from app.features.admin.presentation.dependencies import require_permission
from app.features.catalog.infrastructure.persistence.admin_catalog_repository import (
    AdminCatalogRepository,
)
from app.features.catalog.infrastructure.persistence.models import ProductModel
from app.features.integrations.moysklad.application.export_order import export_order_by_id
from app.features.integrations.moysklad.application.full_resync import run_full_resync
from app.features.integrations.moysklad.application.import_catalog import run_moysklad_catalog_import
from app.features.integrations.moysklad.application.sync_stock import run_moysklad_stock_sync
from app.features.integrations.moysklad.infrastructure.http_client import build_moysklad_client
from app.features.integrations.moysklad.infrastructure.persistence.order_export_repository import (
    OrderExportRepository,
)
from app.features.integrations.moysklad.infrastructure.persistence.sync_repository import (
    SyncStateRepository,
)

router = APIRouter(prefix="/admin/integrations/moysklad", tags=["admin"])


class MoySkladIntegrationStatusResponse(BaseModel):
    configured: bool
    api_token_configured: bool = False
    store_id_configured: bool = False
    read_only: bool = True
    order_export_enabled: bool = False
    store_id: str | None
    webhooks_enabled: bool
    pending_order_exports: int = 0
    last_full_sync_at: str | None
    last_incremental_sync_at: str | None
    last_error: str | None
    errors_last_24h: int
    pending_imports: int = 0
    needs_color_photos: int = 0


class MoySkladPullResponse(BaseModel):
    status: str
    direction: str = Field(default="inbound", description="Always inbound — data flows MS → site")
    products_created: int = 0
    products_updated: int = 0
    variants_created: int = 0
    variants_updated: int = 0
    stock_rows_applied: int = 0
    errors: list[str] = Field(default_factory=list)


class MoySkladStockPullResponse(BaseModel):
    status: str
    direction: str = "inbound"
    stock_rows_applied: int
    errors: list[str] = Field(default_factory=list)


class MoySkladFullResyncResponse(BaseModel):
    status: str
    direction: str = Field(default="inbound", description="Catalog/stock inbound; order export outbound")
    products_created: int = 0
    products_updated: int = 0
    variants_created: int = 0
    variants_updated: int = 0
    stock_rows_applied: int = 0
    order_exports_succeeded: int = 0
    errors: list[str] = Field(default_factory=list)


class WebhooksEnabledRequest(BaseModel):
    enabled: bool


class SyncLogSchema(BaseModel):
    id: UUID
    direction: str
    entity_type: str
    entity_id: str | None
    status: str
    error_message: str | None
    created_at: str


class SyncLogListResponse(BaseModel):
    items: list[SyncLogSchema]


class OrderExportResponse(BaseModel):
    status: str
    moysklad_order_id: str | None = None
    error: str | None = None


@router.get(
    "/status",
    response_model=MoySkladIntegrationStatusResponse,
    operation_id="adminMoySkladStatus",
)
async def admin_moysklad_status(
    _admin: AdminUser = Depends(require_permission("admin:read")),
    session: AsyncSession = Depends(get_db_session),
) -> MoySkladIntegrationStatusResponse:
    repo = SyncStateRepository(session)
    state = await repo.get_state()
    errors = await repo.count_recent_errors()
    export_repo = OrderExportRepository(session)
    pending_exports = await export_repo.count_pending_exports()
    token_set = bool(settings.moysklad_api_token.get_secret_value())
    export_enabled = settings.moysklad_order_export_enabled and token_set and bool(
        settings.moysklad_store_id
    )
    pending_imports = int(
        (
            await session.scalar(
                select(func.count())
                .select_from(ProductModel)
                .where(
                    ProductModel.sync_source == "moysklad",
                    ProductModel.category_id.is_(None),
                )
            )
        )
        or 0
    )
    catalog_repo = AdminCatalogRepository(session)
    needs_color_photos_count = await catalog_repo.count_needs_color_photos()

    return MoySkladIntegrationStatusResponse(
        configured=token_set and bool(settings.moysklad_store_id),
        api_token_configured=token_set,
        store_id_configured=bool(settings.moysklad_store_id),
        order_export_enabled=export_enabled,
        store_id=settings.moysklad_store_id or None,
        webhooks_enabled=state.webhooks_enabled,
        pending_order_exports=pending_exports,
        pending_imports=pending_imports,
        needs_color_photos=needs_color_photos_count,
        last_full_sync_at=state.last_full_sync_at.isoformat() if state.last_full_sync_at else None,
        last_incremental_sync_at=(
            state.last_incremental_sync_at.isoformat() if state.last_incremental_sync_at else None
        ),
        last_error=state.last_error,
        errors_last_24h=errors,
    )


def _ensure_configured() -> None:
    if build_moysklad_client() is None:
        raise HTTPException(status_code=503, detail="MoySklad API token is not configured")
    if not settings.moysklad_store_id:
        raise HTTPException(status_code=503, detail="MOYSKLAD_STORE_ID is not configured")


@router.post(
    "/sync/pull",
    response_model=MoySkladPullResponse,
    operation_id="adminMoySkladPullCatalog",
)
async def admin_moysklad_pull_catalog(
    _admin: AdminUser = Depends(require_permission("integrations:write")),
    session: AsyncSession = Depends(get_db_session),
) -> MoySkladPullResponse:
    """Pull full catalog + stock FROM MoySklad into the site. Does not modify MoySklad."""
    _ensure_configured()
    try:
        result = await run_moysklad_catalog_import(session)
        await session.commit()
    except Exception as exc:
        await session.rollback()
        raise HTTPException(status_code=502, detail=f"Import from MoySklad failed: {exc}") from exc

    return MoySkladPullResponse(
        status="partial" if result.errors else "success",
        products_created=result.products_created,
        products_updated=result.products_updated,
        variants_created=result.variants_created,
        variants_updated=result.variants_updated,
        stock_rows_applied=result.stock_rows_applied,
        errors=result.errors[:20],
    )


@router.post(
    "/sync/stock",
    response_model=MoySkladStockPullResponse,
    operation_id="adminMoySkladPullStock",
)
async def admin_moysklad_pull_stock(
    _admin: AdminUser = Depends(require_permission("integrations:write")),
    session: AsyncSession = Depends(get_db_session),
) -> MoySkladStockPullResponse:
    """Pull stock quantities FROM MoySklad. Does not modify MoySklad."""
    _ensure_configured()
    try:
        result = await run_moysklad_stock_sync(session)
        await session.commit()
    except Exception as exc:
        await session.rollback()
        raise HTTPException(status_code=502, detail=f"Stock pull from MoySklad failed: {exc}") from exc

    return MoySkladStockPullResponse(
        status="partial" if result.errors else "success",
        stock_rows_applied=result.rows_applied,
        errors=result.errors[:20],
    )


@router.post(
    "/sync/resync",
    response_model=MoySkladFullResyncResponse,
    operation_id="adminMoySkladFullResync",
)
async def admin_moysklad_full_resync(
    _admin: AdminUser = Depends(require_permission("integrations:write")),
    session: AsyncSession = Depends(get_db_session),
) -> MoySkladFullResyncResponse:
    """Full resync: catalog + stock from MS, then retry pending order exports."""
    _ensure_configured()
    try:
        result = await run_full_resync(session)
        await session.commit()
    except Exception as exc:
        await session.rollback()
        raise HTTPException(status_code=502, detail=f"Full resync failed: {exc}") from exc

    return MoySkladFullResyncResponse(
        status="partial" if result.errors else "success",
        products_created=result.products_created,
        products_updated=result.products_updated,
        variants_created=result.variants_created,
        variants_updated=result.variants_updated,
        stock_rows_applied=result.stock_rows_applied,
        order_exports_succeeded=result.order_exports_succeeded,
        errors=result.errors[:20],
    )


@router.patch(
    "/webhooks/enabled",
    operation_id="adminMoySkladWebhooksEnabled",
)
async def admin_moysklad_set_webhooks_enabled(
    request: WebhooksEnabledRequest,
    _admin: AdminUser = Depends(require_permission("integrations:write")),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, bool]:
    """Enable/disable processing of inbound MoySklad webhooks on this site only."""
    repo = SyncStateRepository(session)
    state = await repo.get_state()
    state.webhooks_enabled = request.enabled
    await session.commit()
    return {"webhooks_enabled": state.webhooks_enabled}


# Deprecated alias — kept for backward compatibility
@router.post(
    "/sync/trigger",
    response_model=MoySkladPullResponse,
    operation_id="adminMoySkladTriggerSync",
    deprecated=True,
)
async def admin_moysklad_trigger_sync_deprecated(
    admin: AdminUser = Depends(require_permission("integrations:write")),
    session: AsyncSession = Depends(get_db_session),
) -> MoySkladPullResponse:
    return await admin_moysklad_pull_catalog(_admin=admin, session=session)


@router.get(
    "/logs",
    response_model=SyncLogListResponse,
    operation_id="adminMoySkladSyncLogs",
)
async def admin_moysklad_sync_logs(
    _admin: AdminUser = Depends(require_permission("admin:read")),
    session: AsyncSession = Depends(get_db_session),
) -> SyncLogListResponse:
    repo = SyncStateRepository(session)
    rows = await repo.list_recent_logs(limit=50)
    return SyncLogListResponse(
        items=[
            SyncLogSchema(
                id=row.id,
                direction=row.direction,
                entity_type=row.entity_type,
                entity_id=row.entity_id,
                status=row.status,
                error_message=row.error_message,
                created_at=row.created_at.isoformat(),
            )
            for row in rows
        ]
    )


@router.post(
    "/orders/{order_number}/export",
    response_model=OrderExportResponse,
    operation_id="adminMoySkladExportOrder",
)
async def admin_moysklad_export_order(
    order_number: str,
    _admin: AdminUser = Depends(require_permission("integrations:write")),
    session: AsyncSession = Depends(get_db_session),
) -> OrderExportResponse:
    """Export a confirmed site order to MoySklad (outbound). Does not block site order."""
    export_repo = OrderExportRepository(session)
    order_id = await export_repo.get_order_id_by_number(order_number)
    if order_id is None:
        raise HTTPException(status_code=404, detail="Order not found")

    result = await export_order_by_id(session, order_id)
    await session.commit()
    return OrderExportResponse(
        status=result.status,
        moysklad_order_id=result.moysklad_order_id,
        error=result.error,
    )
