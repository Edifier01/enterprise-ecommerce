"""Auth domain entities."""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class User:
    id: UUID
    email: str
    hashed_password: str
    is_active: bool
    is_wholesaler: bool
    created_at: datetime
    first_name: str = ""
    last_name: str = ""
    email_verified_at: datetime | None = None

    @property
    def is_email_verified(self) -> bool:
        return self.email_verified_at is not None


@dataclass(frozen=True, slots=True)
class AuthToken:
    id: UUID
    user_id: UUID
    token_hash: str
    token_type: str
    expires_at: datetime
    used_at: datetime | None
    created_at: datetime


@dataclass(frozen=True, slots=True)
class WholesalerProfile:
    user_id: UUID
    full_name: str
    edo_provider: str
    edo_id: str
    phone: str
    inn: str
    ogrnip: str
    legal_address: str
    created_at: datetime
