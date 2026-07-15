"""Resend email verification link."""

from app.features.auth.application.use_cases.send_email_verification import (
    SendEmailVerificationUseCase,
)
from app.features.auth.domain.ports import IUserRepository


class ResendVerificationUseCase:
    def __init__(
        self,
        user_repository: IUserRepository,
        send_verification: SendEmailVerificationUseCase,
    ) -> None:
        self._user_repository = user_repository
        self._send_verification = send_verification

    async def execute(self, email: str) -> None:
        user = await self._user_repository.get_by_email(email)
        if user is None or user.is_email_verified:
            return
        await self._send_verification.execute(user)
