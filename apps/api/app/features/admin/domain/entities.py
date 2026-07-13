"""Admin domain entities."""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.features.admin.domain.permissions import permissions_for_role


@dataclass(frozen=True, slots=True)
class AdminUser:
    id: UUID
    email: str
    hashed_password: str
    role: str
    is_active: bool
    created_at: datetime

    @property
    def permissions(self) -> frozenset[str]:
        return permissions_for_role(self.role)
