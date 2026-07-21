"""Application configuration."""

from pathlib import Path

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_JWT_DEV_DEFAULT = "dev-secret-change-in-production"
_ADMIN_DEV_EMAIL_DEFAULT = "admin@localhost"
_ADMIN_DEV_PASSWORD_DEFAULT = "admin12345"


def _parse_admin_login_allowed_ips_value(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(ip).strip() for ip in value if str(ip).strip()]
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped or stripped == "[]":
            return []
        if stripped.startswith("["):
            import json

            try:
                parsed = json.loads(stripped)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, list):
                return [str(ip).strip() for ip in parsed if str(ip).strip()]
        return [ip.strip() for ip in stripped.split(",") if ip.strip()]
    return []


def _env_file_paths() -> tuple[str, ...]:
    """Resolve .env paths for monorepo (local) and Docker (/app) layouts."""
    paths: list[str] = []
    for parent in Path(__file__).resolve().parents:
        candidate = parent / ".env"
        if candidate.is_file():
            paths.append(str(candidate))
            break
    paths.append(".env")
    return tuple(paths)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_file_paths(),
        env_file_encoding="utf-8",
    )

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/ecommerce"
    cors_origins: list[str] = ["http://localhost:3000"]
    payment_provider: str = "auto"
    stripe_secret_key: SecretStr = SecretStr("")
    stripe_webhook_secret: SecretStr = SecretStr("")
    environment: str = "development"
    jwt_secret_key: SecretStr = SecretStr(_JWT_DEV_DEFAULT)
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    storefront_url: str = "http://localhost:3000"
    email_provider: str = "console"
    email_from: str = "noreply@example.com"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: SecretStr = SecretStr("")
    smtp_use_tls: bool = True
    auth_verification_token_expire_hours: int = 24
    auth_reset_token_expire_hours: int = 1
    inventory_reservation_ttl_minutes: int = 15
    inventory_reservation_sweep_enabled: bool = True
    inventory_reservation_sweep_interval_seconds: int = 60
    admin_low_stock_threshold: int = 5
    admin_inventory_manual_adjust_enabled: bool = False
    storefront_min_available_stock: int = 3
    admin_dev_email: str = _ADMIN_DEV_EMAIL_DEFAULT
    admin_dev_password: str = _ADMIN_DEV_PASSWORD_DEFAULT
    media_upload_dir: str = "uploads"
    media_max_upload_bytes: int = 5 * 1024 * 1024
    media_public_base_url: str = "http://localhost:8000/media"
    admin_login_max_attempts: int = 5
    admin_login_lockout_minutes: int = 15
    admin_login_allowed_ips_env: str = Field(default="", validation_alias="ADMIN_LOGIN_ALLOWED_IPS")
    admin_media_upload_limit_per_minute: int = 20
    trusted_proxy_hops: int = 0

    @property
    def admin_login_allowed_ips(self) -> list[str]:
        return _parse_admin_login_allowed_ips_value(self.admin_login_allowed_ips_env)

    # MoySklad integration (ADR-010)
    moysklad_api_token: SecretStr = SecretStr("")
    moysklad_store_id: str = ""
    moysklad_retail_price_type: str = "Цена продажи"
    moysklad_wholesale_price_type: str = "Розница"
    moysklad_webhook_secret: SecretStr = SecretStr("")
    moysklad_sync_cron_enabled: bool = False
    moysklad_sync_cron_interval_seconds: int = 600
    moysklad_organization_id: str = ""
    moysklad_order_export_enabled: bool = True

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_database_url(cls, value: object) -> object:
        """Ensure async SQLAlchemy uses asyncpg, not psycopg2."""
        if not isinstance(value, str):
            return value
        if value.startswith("postgresql://"):
            return "postgresql+asyncpg://" + value.removeprefix("postgresql://")
        if value.startswith("postgres://"):
            return "postgresql+asyncpg://" + value.removeprefix("postgres://")
        return value

    def get_payment_provider(self) -> str:
        """Resolve payment provider: auto picks stub when Stripe is not configured."""
        if self.payment_provider in ("stub", "stripe"):
            return self.payment_provider
        if self.stripe_secret_key.get_secret_value():
            return "stripe"
        return "stub"

    def moysklad_enabled(self) -> bool:
        return bool(self.moysklad_api_token.get_secret_value().strip())

    @model_validator(mode="after")
    def _validate_production_secrets(self) -> "Settings":
        if self.environment != "production":
            return self

        if self.jwt_secret_key.get_secret_value() == _JWT_DEV_DEFAULT:
            raise ValueError(
                "jwt_secret_key must be changed from the development default before running in production."
            )
        if self.get_payment_provider() == "stub":
            raise ValueError(
                "payment_provider=stub is not allowed in production."
            )
        if not self.media_public_base_url.strip():
            raise ValueError(
                "media_public_base_url is required in production."
            )
        if not self.media_public_base_url.startswith("https://"):
            raise ValueError(
                "media_public_base_url must use https in production."
            )
        if self.admin_dev_email == _ADMIN_DEV_EMAIL_DEFAULT:
            raise ValueError(
                "admin_dev_email must not use the development default in production."
            )
        if self.admin_dev_password == _ADMIN_DEV_PASSWORD_DEFAULT:
            raise ValueError(
                "admin_dev_password must not use the development default in production."
            )
        if self.moysklad_enabled() and not self.moysklad_webhook_secret.get_secret_value().strip():
            raise ValueError(
                "moysklad_webhook_secret is required in production when MOYSKLAD_API_TOKEN is set."
            )
        if "*" in self.cors_origins:
            raise ValueError(
                "cors_origins must not include '*' when credentials are enabled in production."
            )
        return self


settings = Settings()
