"""Request a password reset email."""

import uuid
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.features.auth.application.auth_token_utils import generate_raw_token, hash_token
from app.features.auth.domain.auth_token_type import PASSWORD_RESET
from app.features.auth.domain.entities import AuthToken
from app.features.auth.domain.ports import (
    EmailMessage,
    IAuthTokenRepository,
    IEmailService,
    IUnitOfWork,
    IUserRepository,
)


class ForgotPasswordUseCase:
    def __init__(
        self,
        user_repository: IUserRepository,
        token_repository: IAuthTokenRepository,
        email_service: IEmailService,
        unit_of_work: IUnitOfWork,
    ) -> None:
        self._user_repository = user_repository
        self._token_repository = token_repository
        self._email_service = email_service
        self._unit_of_work = unit_of_work

    async def execute(self, email: str) -> None:
        user = await self._user_repository.get_by_email(email)
        if user is None or not user.is_email_verified:
            return

        await self._token_repository.revoke_active_for_user(user.id, PASSWORD_RESET)

        raw_token = generate_raw_token()
        now = datetime.now(timezone.utc)
        token = AuthToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=hash_token(raw_token),
            token_type=PASSWORD_RESET,
            expires_at=now + timedelta(hours=settings.auth_reset_token_expire_hours),
            used_at=None,
            created_at=now,
        )
        await self._token_repository.create(token)

        reset_url = f"{settings.storefront_url.rstrip('/')}/reset-password?token={raw_token}"
        await self._email_service.send(
            EmailMessage(
                to=user.email,
                subject="Восстановление пароля — Сухопут",
                body_text=(
                    "Здравствуйте!\n\n"
                    "Для сброса пароля перейдите по ссылке:\n"
                    f"{reset_url}\n\n"
                    "Ссылка действует ограниченное время. "
                    "Если вы не запрашивали сброс, проигнорируйте это письмо."
                ),
            )
        )
        await self._unit_of_work.commit()
