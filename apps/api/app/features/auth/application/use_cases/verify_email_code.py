"""Verify email with a 6-digit code from the registration email."""

from datetime import datetime, timezone

from app.features.auth.application.auth_token_utils import hash_token
from app.features.auth.application.use_cases.verify_email import InvalidVerificationTokenError
from app.features.auth.domain.auth_token_type import EMAIL_VERIFICATION
from app.features.auth.domain.entities import User
from app.features.auth.domain.ports import IAuthTokenRepository, IUnitOfWork, IUserRepository


class VerifyEmailCodeUseCase:
    def __init__(
        self,
        user_repository: IUserRepository,
        token_repository: IAuthTokenRepository,
        unit_of_work: IUnitOfWork,
    ) -> None:
        self._user_repository = user_repository
        self._token_repository = token_repository
        self._unit_of_work = unit_of_work

    async def execute(self, email: str, code: str) -> User:
        user = await self._user_repository.get_by_email(email)
        if user is None or user.is_email_verified:
            raise InvalidVerificationTokenError()

        token = await self._token_repository.get_valid_by_hash(
            hash_token(code),
            EMAIL_VERIFICATION,
        )
        if token is None or token.user_id != user.id:
            raise InvalidVerificationTokenError()

        now = datetime.now(timezone.utc)
        verified_user = await self._user_repository.mark_email_verified(
            token.user_id,
            verified_at=now,
        )
        if verified_user is None:
            raise InvalidVerificationTokenError()

        await self._token_repository.mark_used(token.id, used_at=now)
        await self._token_repository.revoke_active_for_user(token.user_id, EMAIL_VERIFICATION)
        await self._unit_of_work.commit()
        return verified_user
