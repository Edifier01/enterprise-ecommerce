"""In-memory email capture for tests."""

from app.features.auth.domain.ports import EmailMessage, IEmailService


class RecordingEmailService(IEmailService):
    def __init__(self) -> None:
        self.messages: list[EmailMessage] = []

    async def send(self, message: EmailMessage) -> None:
        self.messages.append(message)

    def clear(self) -> None:
        self.messages.clear()

    @property
    def last(self) -> EmailMessage | None:
        return self.messages[-1] if self.messages else None
