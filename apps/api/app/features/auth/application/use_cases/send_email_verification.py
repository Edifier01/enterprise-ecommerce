"""Issue and deliver email verification links."""

import uuid
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.features.auth.application.auth_token_utils import (
    generate_raw_token,
    generate_verification_code,
    hash_token,
)
from app.features.auth.domain.auth_token_type import EMAIL_VERIFICATION
from app.features.auth.domain.entities import AuthToken, User
from app.features.auth.domain.ports import (
    EmailMessage,
    IAuthTokenRepository,
    IEmailService,
    IUnitOfWork,
)
from app.features.auth.infrastructure.email.templates import build_verification_email


class SendEmailVerificationUseCase:
    def __init__(
        self,
        token_repository: IAuthTokenRepository,
        email_service: IEmailService,
        unit_of_work: IUnitOfWork,
    ) -> None:
        self._token_repository = token_repository
        self._email_service = email_service
        self._unit_of_work = unit_of_work

    async def execute(self, user: User) -> None:
        if user.is_email_verified:
            return

        await self._token_repository.revoke_active_for_user(user.id, EMAIL_VERIFICATION)

        raw_token = generate_raw_token()
        verification_code = generate_verification_code()
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=settings.auth_verification_token_expire_hours)

        link_token = AuthToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=hash_token(raw_token),
            token_type=EMAIL_VERIFICATION,
            expires_at=expires_at,
            used_at=None,
            created_at=now,
        )
        code_token = AuthToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=hash_token(verification_code),
            token_type=EMAIL_VERIFICATION,
            expires_at=expires_at,
            used_at=None,
            created_at=now,
        )
        await self._token_repository.create(link_token)
        await self._token_repository.create(code_token)

        verify_url = (
            f"{settings.storefront_url.rstrip('/')}/verify-email?token={raw_token}"
        )
        subject, body_text, body_html = build_verification_email(
            verify_url=verify_url,
            verification_code=verification_code,
        )
        await self._email_service.send(
            EmailMessage(
                to=user.email,
                subject=subject,
                body_text=body_text,
                body_html=body_html,
            )
        )
        await self._unit_of_work.commit()
