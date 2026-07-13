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
