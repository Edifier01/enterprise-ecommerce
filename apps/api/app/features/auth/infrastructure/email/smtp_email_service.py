"""SMTP email adapter."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage as MimeEmail

from app.core.config import settings
from app.features.auth.domain.ports import EmailMessage, IEmailService

logger = logging.getLogger(__name__)


class SmtpEmailService(IEmailService):
    async def send(self, message: EmailMessage) -> None:
        host = settings.smtp_host.strip()
        if not host:
            raise RuntimeError(
                "SMTP is not configured. Set SMTP_HOST and related variables, "
                "or use EMAIL_PROVIDER=console for development."
            )

        await asyncio.to_thread(_send_sync, host, message)


def _send_sync(host: str, message: EmailMessage) -> None:
    mime = MimeEmail()
    mime["From"] = settings.email_from
    mime["To"] = message.to
    mime["Subject"] = message.subject
    mime.set_content(message.body_text)

    password = settings.smtp_password.get_secret_value()
    user = settings.smtp_user.strip()

    try:
        if settings.smtp_use_tls:
            with smtplib.SMTP(host, settings.smtp_port, timeout=30) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.ehlo()
                if user:
                    smtp.login(user, password)
                smtp.send_message(mime)
        else:
            with smtplib.SMTP_SSL(host, settings.smtp_port, timeout=30) as smtp:
                if user:
                    smtp.login(user, password)
                smtp.send_message(mime)
    except smtplib.SMTPException:
        logger.exception("SMTP delivery failed to=%s subject=%s", message.to, message.subject)
        raise
