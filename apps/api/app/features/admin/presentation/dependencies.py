"""Admin FastAPI dependencies — DI and RBAC."""

from collections.abc import Callable

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.features.admin.domain.entities import AdminUser
from app.features.admin.domain.ports import (
    IAdminDashboardRepository,
    IAdminUserRepository,
    InvalidAdminTokenError,
)
from app.features.admin.infrastructure.persistence.dashboard_repository import (
    AdminDashboardRepository,
)
from app.features.admin.infrastructure.persistence.repository import AdminUserRepository
from app.features.admin.infrastructure.security.admin_jwt_token_service import (
    AdminJwtTokenService,
)
from app.features.auth.domain.ports import IPasswordHasher
from app.features.auth.infrastructure.security.bcrypt_hasher import BcryptPasswordHasher

_bearer = HTTPBearer(auto_error=False)


def get_admin_user_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IAdminUserRepository:
    return AdminUserRepository(session)


def get_admin_dashboard_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IAdminDashboardRepository:
    return AdminDashboardRepository(session)


def get_password_hasher() -> IPasswordHasher:
    return BcryptPasswordHasher()


def get_admin_token_service() -> AdminJwtTokenService:
    return AdminJwtTokenService(
        secret_key=settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
        expire_minutes=settings.jwt_access_token_expire_minutes,
    )


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    repo: IAdminUserRepository = Depends(get_admin_user_repository),
    token_service: AdminJwtTokenService = Depends(get_admin_token_service),
) -> AdminUser:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        claims = token_service.verify_access_token(credentials.credentials)
    except InvalidAdminTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    admin = await repo.get_by_id(claims.admin_id)
    if admin is None or not admin.is_active:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return admin


def require_permission(permission: str) -> Callable[..., object]:
    async def _checker(admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
        if permission not in admin.permissions:
            raise HTTPException(status_code=403, detail="Forbidden")
        return admin

    return _checker
