"""Admin customer management — wholesaler status (ADR-008)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.features.admin.domain.entities import AdminUser
from app.features.admin.presentation.dependencies import require_permission
from app.features.auth.domain.ports import IUserRepository
from app.features.auth.infrastructure.persistence.repository import UserRepository
from app.features.auth.presentation.admin_customers_schemas import (
    AdminCustomerListResponse,
    AdminCustomerSchema,
    AdminUpdateWholesalerRequest,
)

router = APIRouter(prefix="/admin/customers", tags=["admin"])


def get_user_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IUserRepository:
    return UserRepository(session)


@router.get("", response_model=AdminCustomerListResponse, operation_id="adminListCustomers")
async def admin_list_customers(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    _admin: AdminUser = Depends(require_permission("customers:read")),
    repo: IUserRepository = Depends(get_user_repository),
) -> AdminCustomerListResponse:
    users, total = await repo.list_customers(page=page, limit=limit)
    return AdminCustomerListResponse(
        items=[
            AdminCustomerSchema(
                id=user.id,
                email=user.email,
                is_wholesaler=user.is_wholesaler,
                created_at=user.created_at,
            )
            for user in users
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.patch(
    "/{customer_id}/wholesaler",
    response_model=AdminCustomerSchema,
    operation_id="adminUpdateCustomerWholesaler",
)
async def admin_update_customer_wholesaler(
    customer_id: UUID,
    request: AdminUpdateWholesalerRequest,
    _admin: AdminUser = Depends(require_permission("customers:write")),
    repo: IUserRepository = Depends(get_user_repository),
    session: AsyncSession = Depends(get_db_session),
) -> AdminCustomerSchema:
    user = await repo.set_wholesaler(customer_id, is_wholesaler=request.is_wholesaler)
    if user is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    await session.commit()
    return AdminCustomerSchema(
        id=user.id,
        email=user.email,
        is_wholesaler=user.is_wholesaler,
        created_at=user.created_at,
    )
