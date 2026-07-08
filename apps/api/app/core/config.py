"""Application configuration."""

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_JWT_DEV_DEFAULT = "dev-secret-change-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ecommerce"
    cors_origins: list[str] = ["http://localhost:3000"]
    stripe_secret_key: SecretStr = SecretStr("")
    stripe_webhook_secret: SecretStr = SecretStr("")
    environment: str = "development"
    jwt_secret_key: SecretStr = SecretStr(_JWT_DEV_DEFAULT)
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30

    @model_validator(mode="after")
    def _validate_production_secrets(self) -> "Settings":
        if self.environment == "production":
            if self.jwt_secret_key.get_secret_value() == _JWT_DEV_DEFAULT:
                raise ValueError(
                    "jwt_secret_key must be changed from the development default before running in production."
                )
        return self


settings = Settings()
