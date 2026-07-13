"""Login admin use case."""

from app.features.admin.domain.ports import IAdminUserRepository
from app.features.admin.infrastructure.security.admin_jwt_token_service import (
    AdminJwtTokenService,
)
from app.features.auth.domain.ports import IPasswordHasher


class InvalidAdminCredentialsError(Exception):
    """Raised when admin email/password combination is invalid."""


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

    async def execute(self, email: str, password: str) -> str:
        admin = await self._repository.get_by_email(email)
        candidate_hash = admin.hashed_password if admin is not None else self._hasher.dummy_hash
        password_valid = self._hasher.verify(password, candidate_hash)

        if admin is None or not password_valid or not admin.is_active:
            raise InvalidAdminCredentialsError()

        return self._token_service.create_access_token(
            admin_id=str(admin.id),
            email=admin.email,
            role=admin.role,
            permissions=admin.permissions,
        )
