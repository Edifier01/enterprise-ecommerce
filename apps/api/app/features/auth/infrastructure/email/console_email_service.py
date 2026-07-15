"""Console email adapter — logs messages for local development."""

import logging

from app.features.auth.domain.ports import EmailMessage, IEmailService

logger = logging.getLogger(__name__)


class ConsoleEmailService(IEmailService):
    async def send(self, message: EmailMessage) -> None:
        logger.info(
            "EMAIL to=%s subject=%s\n%s",
            message.to,
            message.subject,
            message.body_text,
        )
