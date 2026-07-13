"""Admin JWT value objects."""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class AdminTokenClaims:
    admin_id: UUID
    email: str
    role: str
    permissions: frozenset[str]
