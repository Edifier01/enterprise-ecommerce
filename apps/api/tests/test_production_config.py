"""Production settings validation tests."""

import pytest
from pydantic import ValidationError

from app.core.config import (
    Settings,
    _ADMIN_DEV_EMAIL_DEFAULT,
    _ADMIN_DEV_PASSWORD_DEFAULT,
    _JWT_DEV_DEFAULT,
)


def _base_production_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", "a" * 32)
    monkeypatch.setenv("PAYMENT_PROVIDER", "stripe")
    monkeypatch.setenv("MEDIA_PUBLIC_BASE_URL", "https://shop.example.com/media")
    monkeypatch.setenv("ADMIN_DEV_EMAIL", "ops@shop.example.com")
    monkeypatch.setenv("ADMIN_DEV_PASSWORD", "strong-admin-password")
    monkeypatch.setenv("MOYSKLAD_API_TOKEN", "")
    monkeypatch.setenv("MOYSKLAD_WEBHOOK_SECRET", "")


def test_production_settings_valid_with_local_media(monkeypatch: pytest.MonkeyPatch) -> None:
    _base_production_env(monkeypatch)
    settings = Settings()
    assert settings.media_public_base_url == "https://shop.example.com/media"


def test_production_rejects_missing_media_public_base_url(monkeypatch: pytest.MonkeyPatch) -> None:
    _base_production_env(monkeypatch)
    monkeypatch.delenv("MEDIA_PUBLIC_BASE_URL", raising=False)
    with pytest.raises(ValidationError, match="media_public_base_url"):
        Settings()


def test_production_rejects_http_media_public_base_url(monkeypatch: pytest.MonkeyPatch) -> None:
    _base_production_env(monkeypatch)
    monkeypatch.setenv("MEDIA_PUBLIC_BASE_URL", "http://shop.example.com/media")
    with pytest.raises(ValidationError, match="https"):
        Settings()


def test_production_rejects_dev_jwt_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    _base_production_env(monkeypatch)
    monkeypatch.setenv("JWT_SECRET_KEY", _JWT_DEV_DEFAULT)
    with pytest.raises(ValidationError, match="jwt_secret_key"):
        Settings()


def test_production_rejects_default_admin_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    _base_production_env(monkeypatch)
    monkeypatch.setenv("ADMIN_DEV_EMAIL", _ADMIN_DEV_EMAIL_DEFAULT)
    with pytest.raises(ValidationError, match="admin_dev_email"):
        Settings()

    _base_production_env(monkeypatch)
    monkeypatch.setenv("ADMIN_DEV_PASSWORD", _ADMIN_DEV_PASSWORD_DEFAULT)
    with pytest.raises(ValidationError, match="admin_dev_password"):
        Settings()


def test_production_requires_moysklad_webhook_secret_when_integration_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _base_production_env(monkeypatch)
    monkeypatch.setenv("MOYSKLAD_API_TOKEN", "test-token")
    monkeypatch.setenv("MOYSKLAD_WEBHOOK_SECRET", "")
    with pytest.raises(ValidationError, match="moysklad_webhook_secret"):
        Settings()
