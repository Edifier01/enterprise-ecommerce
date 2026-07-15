"""Reset password with a single-use token."""

from datetime import datetime, timezone

from app.features.auth.application.auth_token_utils import hash_token
from app.features.auth.domain.auth_token_type import PASSWORD_RESET
from app.features.auth.domain.ports import (
    IAuthTokenRepository,
    IPasswordHasher,
    IUnitOfWork,
    IUserRepository,
)


class InvalidResetTokenError(Exception):
    """Raised when the reset token is invalid or expired."""


class ResetPasswordUseCase:
    def __init__(
        self,
        user_repository: IUserRepository,
        token_repository: IAuthTokenRepository,
        hasher: IPasswordHasher,
        unit_of_work: IUnitOfWork,
    ) -> None:
        self._user_repository = user_repository
        self._token_repository = token_repository
        self._hasher = hasher
        self._unit_of_work = unit_of_work

    async def execute(self, raw_token: str, new_password: str) -> None:
        token = await self._token_repository.get_valid_by_hash(
            hash_token(raw_token),
            PASSWORD_RESET,
        )
        if token is None:
            raise InvalidResetTokenError()

        now = datetime.now(timezone.utc)
        hashed_password = self._hasher.hash(new_password)
        user = await self._user_repository.update_password(token.user_id, hashed_password)
        if user is None:
            raise InvalidResetTokenError()

        await self._token_repository.mark_used(token.id, used_at=now)
        await self._token_repository.revoke_active_for_user(token.user_id, PASSWORD_RESET)
        await self._unit_of_work.commit()
