"""Admin inventory HTTP routes."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.features.admin.domain.entities import AdminUser
from app.features.admin.presentation.dependencies import require_permission
from app.features.inventory.domain.admin_ports import (
    IAdminInventoryRepository,
    InsufficientOnHandError,
    InventoryItemNotFoundError,
    VersionConflictError,
)
from app.features.integrations.moysklad.domain.sync_guard import SyncProtectedFieldError
from app.features.inventory.infrastructure.persistence.admin_inventory_repository import (
    AdminInventoryRepository,
)
from app.features.inventory.presentation.admin_schemas import (
    AdminAdjustInventoryRequest,
    AdminInventoryItemSchema,
    AdminInventoryListResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/inventory", tags=["admin"])


def get_admin_inventory_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IAdminInventoryRepository:
    return AdminInventoryRepository(session)


def _row_schema(row) -> AdminInventoryItemSchema:
    return AdminInventoryItemSchema(
        variant_id=row.variant_id,
        sku=row.sku,
        product_name=row.product_name,
        quantity_on_hand=row.quantity_on_hand,
        quantity_reserved=row.quantity_reserved,
        available=row.available,
        version=row.version,
        is_low_stock=row.is_low_stock,
    )


@router.get("", response_model=AdminInventoryListResponse, operation_id="adminListInventory")
async def admin_list_inventory(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    low_stock: bool = Query(default=False),
    _admin: AdminUser = Depends(require_permission("admin:read")),
    repo: IAdminInventoryRepository = Depends(get_admin_inventory_repository),
) -> AdminInventoryListResponse:
    threshold = settings.admin_low_stock_threshold
    items, total = await repo.list_inventory(
        page=page,
        limit=limit,
        low_stock_only=low_stock,
        low_stock_threshold=threshold,
    )
    return AdminInventoryListResponse(
        items=[_row_schema(item) for item in items],
        total=total,
        page=page,
        limit=limit,
        low_stock_threshold=threshold,
    )


@router.patch(
    "/{variant_id}",
    response_model=AdminInventoryItemSchema,
    operation_id="adminAdjustInventory",
)
async def admin_adjust_inventory(
    variant_id: UUID,
    request: AdminAdjustInventoryRequest,
    admin: AdminUser = Depends(require_permission("inventory:write")),
    repo: IAdminInventoryRepository = Depends(get_admin_inventory_repository),
    session: AsyncSession = Depends(get_db_session),
) -> AdminInventoryItemSchema:
    try:
        row = await repo.adjust_quantity_on_hand(
            variant_id=variant_id,
            quantity_on_hand=request.quantity_on_hand,
            expected_version=request.version,
            low_stock_threshold=settings.admin_low_stock_threshold,
        )
    except InventoryItemNotFoundError:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    except VersionConflictError:
        raise HTTPException(
            status_code=409,
            detail="Inventory was updated by another process; refresh and retry",
        )
    except InsufficientOnHandError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"quantity_on_hand cannot be less than reserved quantity ({exc.reserved_quantity})",
        )
    except SyncProtectedFieldError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    logger.info(
        "admin_inventory_adjusted",
        extra={
            "admin_id": str(admin.id),
            "variant_id": str(variant_id),
            "quantity_on_hand": request.quantity_on_hand,
            "reason": request.reason,
            "version": row.version,
        },
    )
    await session.commit()
    return _row_schema(row)
