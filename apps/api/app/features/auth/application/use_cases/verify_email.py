"""Verify email with a single-use token."""

from datetime import datetime, timezone

from app.features.auth.application.auth_token_utils import hash_token
from app.features.auth.domain.auth_token_type import EMAIL_VERIFICATION
from app.features.auth.domain.entities import User
from app.features.auth.domain.ports import IAuthTokenRepository, IUnitOfWork, IUserRepository


class InvalidVerificationTokenError(Exception):
    """Raised when the verification token is invalid or expired."""


class VerifyEmailUseCase:
    def __init__(
        self,
        user_repository: IUserRepository,
        token_repository: IAuthTokenRepository,
        unit_of_work: IUnitOfWork,
    ) -> None:
        self._user_repository = user_repository
        self._token_repository = token_repository
        self._unit_of_work = unit_of_work

    async def execute(self, raw_token: str) -> User:
        token = await self._token_repository.get_valid_by_hash(
            hash_token(raw_token),
            EMAIL_VERIFICATION,
        )
        if token is None:
            raise InvalidVerificationTokenError()

        now = datetime.now(timezone.utc)
        user = await self._user_repository.mark_email_verified(
            token.user_id,
            verified_at=now,
        )
        if user is None:
            raise InvalidVerificationTokenError()

        await self._token_repository.mark_used(token.id, used_at=now)
        await self._unit_of_work.commit()
        return user
