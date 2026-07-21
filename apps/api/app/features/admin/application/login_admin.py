"""Login admin use case."""

from datetime import datetime, timezone

from app.core.config import settings
from app.features.admin.domain.entities import AdminUser
from app.features.admin.domain.ports import IAdminUserRepository
from app.features.admin.infrastructure.security.admin_jwt_token_service import (
    AdminJwtTokenService,
)
from app.features.auth.domain.ports import IPasswordHasher


class InvalidAdminCredentialsError(Exception):
    """Raised when admin email/password combination is invalid."""


class AdminAccountLockedError(Exception):
    """Raised when the admin account is temporarily locked after failed logins."""

    def __init__(self, locked_until: datetime) -> None:
        self.locked_until = locked_until
        super().__init__("Admin account is temporarily locked")


class AdminLoginForbiddenIpError(Exception):
    """Raised when client IP is not on the admin login allowlist."""


def _normalize_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_account_locked(admin: AdminUser) -> bool:
    if admin.locked_until is None:
        return False
    return _normalize_utc(admin.locked_until) > datetime.now(timezone.utc)


def _client_ip_allowed(client_ip: str) -> bool:
    allowlist = settings.admin_login_allowed_ips
    if not allowlist:
        return True
    return client_ip in allowlist


class LoginAdminUseCase:
    def __init__(
        self,
        repository: IAdminUserRepository,
        hasher: IPasswordHasher,
        token_service: AdminJwtTokenService,
    ) -> None:
        self._repository = repository
        self._hasher = hasher
        self._token_service = token_service

    async def execute(self, email: str, password: str, *, client_ip: str) -> str:
        if not _client_ip_allowed(client_ip):
            raise AdminLoginForbiddenIpError()

        admin = await self._repository.get_by_email(email)
        candidate_hash = admin.hashed_password if admin is not None else self._hasher.dummy_hash
        password_valid = self._hasher.verify(password, candidate_hash)

        if admin is not None and _is_account_locked(admin):
            raise AdminAccountLockedError(admin.locked_until)  # type: ignore[arg-type]

        if admin is None or not password_valid or not admin.is_active:
            if admin is not None and admin.is_active:
                updated = await self._repository.record_failed_login(
                    admin.id,
                    max_attempts=settings.admin_login_max_attempts,
                    lockout_minutes=settings.admin_login_lockout_minutes,
                )
                if updated is not None and _is_account_locked(updated):
                    raise AdminAccountLockedError(updated.locked_until)  # type: ignore[arg-type]
            raise InvalidAdminCredentialsError()

        await self._repository.reset_login_attempts(admin.id)

        return self._token_service.create_access_token(
            admin_id=str(admin.id),
            email=admin.email,
            role=admin.role,
            permissions=admin.permissions,
            is_active=admin.is_active,
        )
