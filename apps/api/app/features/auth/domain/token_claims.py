"""Auth domain value objects."""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class TokenClaims:
    user_id: UUID
    email: str
