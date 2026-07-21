"""Admin user repository."""

from datetime import datetime, timedelta, timezone
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
        failed_login_attempts=model.failed_login_attempts,
        locked_until=model.locked_until,
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

    async def reset_login_attempts(self, admin_id: UUID) -> None:
        result = await self._session.execute(
            select(AdminUserModel).where(AdminUserModel.id == admin_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            return
        model.failed_login_attempts = 0
        model.locked_until = None
        await self._session.flush()

    async def record_failed_login(
        self,
        admin_id: UUID,
        *,
        max_attempts: int,
        lockout_minutes: int,
    ) -> AdminUser | None:
        result = await self._session.execute(
            select(AdminUserModel).where(AdminUserModel.id == admin_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        model.failed_login_attempts += 1
        if model.failed_login_attempts >= max_attempts:
            model.locked_until = datetime.now(timezone.utc) + timedelta(minutes=lockout_minutes)
        await self._session.flush()
        return _to_entity(model)

    async def commit(self) -> None:
        await self._session.commit()
