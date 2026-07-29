"""SMTP email adapter — production delivery via reg.ru / any SMTP host."""

import logging
from email.message import EmailMessage as MimeEmailMessage
from email.utils import formataddr

import aiosmtplib

from app.core.config import settings
from app.features.auth.domain.ports import EmailMessage, IEmailService

logger = logging.getLogger(__name__)


class SmtpEmailService(IEmailService):
    async def send(self, message: EmailMessage) -> None:
        if not settings.smtp_host:
            raise RuntimeError(
                "SMTP is not configured. Set SMTP_HOST and related variables, "
                "or use EMAIL_PROVIDER=console for development."
            )

        mime = MimeEmailMessage()
        mime["From"] = formataddr(("Сухопут", settings.email_from))
        mime["To"] = message.to
        mime["Subject"] = message.subject

        reply_to = message.reply_to or settings.email_reply_to
        if reply_to:
            mime["Reply-To"] = reply_to

        mime.set_content(message.body_text, charset="utf-8")
        if message.body_html:
            mime.add_alternative(message.body_html, subtype="html", charset="utf-8")

        username = settings.smtp_user or settings.email_from
        password = settings.smtp_password.get_secret_value()
        use_implicit_ssl = settings.smtp_port == 465

        try:
            await aiosmtplib.send(
                mime,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=username,
                password=password,
                use_tls=use_implicit_ssl,
                start_tls=settings.smtp_use_tls and not use_implicit_ssl,
                timeout=30,
            )
        except aiosmtplib.SMTPException as exc:
            logger.exception(
                "SMTP delivery failed host=%s port=%s to=%s subject=%s",
                settings.smtp_host,
                settings.smtp_port,
                message.to,
                message.subject,
            )
            raise RuntimeError("Failed to send email") from exc

        logger.info(
            "SMTP email sent host=%s to=%s subject=%s",
            settings.smtp_host,
            message.to,
            message.subject,
        )
