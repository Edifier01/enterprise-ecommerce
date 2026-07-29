"""SMTP email service tests."""

from email.message import EmailMessage as MimeEmailMessage
from unittest.mock import AsyncMock, patch

from pydantic import SecretStr

import pytest

from app.core.config import settings
from app.features.auth.domain.ports import EmailMessage
from app.features.auth.infrastructure.email.smtp_email_service import SmtpEmailService


@pytest.mark.asyncio
async def test_smtp_send_uses_starttls_on_port_587(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "smtp_host", "sm42.hosting.reg.ru")
    monkeypatch.setattr(settings, "smtp_port", 587)
    monkeypatch.setattr(settings, "smtp_user", "noreply@example.com")
    monkeypatch.setattr(settings, "smtp_password", SecretStr("secret"))
    monkeypatch.setattr(settings, "smtp_use_tls", True)
    monkeypatch.setattr(settings, "email_from", "noreply@example.com")
    monkeypatch.setattr(settings, "email_reply_to", "support@example.com")

    captured: dict[str, object] = {}

    async def fake_send(message: MimeEmailMessage, **kwargs: object) -> None:
        captured["message"] = message
        captured["kwargs"] = kwargs

    with patch("app.features.auth.infrastructure.email.smtp_email_service.aiosmtplib.send", new=AsyncMock(side_effect=fake_send)):
        service = SmtpEmailService()
        await service.send(
            EmailMessage(
                to="user@example.com",
                subject="Test",
                body_text="Plain body",
                body_html="<p>HTML body</p>",
            )
        )

    kwargs = captured["kwargs"]
    assert kwargs["hostname"] == "sm42.hosting.reg.ru"
    assert kwargs["port"] == 587
    assert kwargs["use_tls"] is False
    assert kwargs["start_tls"] is True
    assert kwargs["username"] == "noreply@example.com"

    mime = captured["message"]
    assert isinstance(mime, MimeEmailMessage)
    assert mime["To"] == "user@example.com"
    assert mime["Reply-To"] == "support@example.com"
    plain_parts = [
        part.get_content()
        for part in mime.walk()
        if part.get_content_type() == "text/plain"
    ]
    assert plain_parts == ["Plain body\n"]
    html_parts = [
        part.get_content()
        for part in mime.walk()
        if part.get_content_type() == "text/html"
    ]
    assert html_parts[0].strip() == "<p>HTML body</p>"


@pytest.mark.asyncio
async def test_smtp_send_uses_implicit_ssl_on_port_465(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "smtp_host", "sm42.hosting.reg.ru")
    monkeypatch.setattr(settings, "smtp_port", 465)
    monkeypatch.setattr(settings, "smtp_user", "noreply@example.com")
    monkeypatch.setattr(settings, "smtp_password", SecretStr("secret"))
    monkeypatch.setattr(settings, "smtp_use_tls", True)
    monkeypatch.setattr(settings, "email_from", "noreply@example.com")
    monkeypatch.setattr(settings, "email_reply_to", "")

    captured: dict[str, object] = {}

    async def fake_send(message: MimeEmailMessage, **kwargs: object) -> None:
        captured["kwargs"] = kwargs

    with patch("app.features.auth.infrastructure.email.smtp_email_service.aiosmtplib.send", new=AsyncMock(side_effect=fake_send)):
        service = SmtpEmailService()
        await service.send(
            EmailMessage(
                to="user@example.com",
                subject="Test",
                body_text="Plain body",
            )
        )

    kwargs = captured["kwargs"]
    assert kwargs["port"] == 465
    assert kwargs["use_tls"] is True
    assert kwargs["start_tls"] is False


@pytest.mark.asyncio
async def test_smtp_send_requires_host(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "smtp_host", "")

    service = SmtpEmailService()
    with pytest.raises(RuntimeError, match="SMTP is not configured"):
        await service.send(
            EmailMessage(
                to="user@example.com",
                subject="Test",
                body_text="Plain body",
            )
        )
