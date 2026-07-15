"""SMTP email adapter — configured in a follow-up step via environment variables."""

from app.core.config import settings
from app.features.auth.domain.ports import EmailMessage, IEmailService


class SmtpEmailService(IEmailService):
    """Placeholder until SMTP credentials are provisioned."""

    async def send(self, message: EmailMessage) -> None:
        if not settings.smtp_host:
            raise RuntimeError(
                "SMTP is not configured. Set SMTP_HOST and related variables, "
                "or use EMAIL_PROVIDER=console for development."
            )
        raise NotImplementedError("SMTP delivery will be enabled in the next configuration step.")
