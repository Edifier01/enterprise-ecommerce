"""Application configuration."""

from pathlib import Path

from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_JWT_DEV_DEFAULT = "dev-secret-change-in-production"
_REPO_ROOT_ENV = Path(__file__).resolve().parents[4] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(_REPO_ROOT_ENV), ".env"),
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
    admin_dev_email: str = "admin@localhost"
    admin_dev_password: str = "admin12345"
    media_upload_dir: str = "uploads"
    media_max_upload_bytes: int = 5 * 1024 * 1024
    media_public_base_url: str = "http://localhost:8000/media"

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

    @model_validator(mode="after")
    def _validate_production_secrets(self) -> "Settings":
        if self.environment == "production":
            if self.jwt_secret_key.get_secret_value() == _JWT_DEV_DEFAULT:
                raise ValueError(
                    "jwt_secret_key must be changed from the development default before running in production."
                )
            if self.get_payment_provider() == "stub":
                raise ValueError(
                    "payment_provider=stub is not allowed in production."
                )
        return self


settings = Settings()
