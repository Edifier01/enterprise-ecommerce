"""Admin user repository."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.admin.domain.entities import AdminUser
from app.features.admin.domain.ports import IAdminUserRepository
from app.features.admin.infrastructure.persistence.models import AdminUserModel


def _to_entity(model: AdminUserModel) -> AdminUser:
    return AdminUser(
        id=model.id,
        email=model.email,
        hashed_password=model.hashed_password,
        role=model.role,
        is_active=model.is_active,
        created_at=model.created_at,
    )


class AdminUserRepository(IAdminUserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, admin_id: UUID) -> AdminUser | None:
        result = await self._session.execute(
            select(AdminUserModel).where(AdminUserModel.id == admin_id)
        )
        model = result.scalar_one_or_none()
        return _to_entity(model) if model is not None else None

    async def get_by_email(self, email: str) -> AdminUser | None:
        result = await self._session.execute(
            select(AdminUserModel).where(AdminUserModel.email == email)
        )
        model = result.scalar_one_or_none()
        return _to_entity(model) if model is not None else None
