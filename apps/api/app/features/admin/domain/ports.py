"""Admin domain ports."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.features.admin.domain.entities import AdminUser


class InvalidAdminTokenError(Exception):
    """Raised when an admin JWT is missing, expired, or malformed."""


class IAdminUserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, admin_id: UUID) -> AdminUser | None:
        ...

    @abstractmethod
    async def get_by_email(self, email: str) -> AdminUser | None:
        ...

    @abstractmethod
    async def reset_login_attempts(self, admin_id: UUID) -> None:
        ...

    @abstractmethod
    async def record_failed_login(
        self,
        admin_id: UUID,
        *,
        max_attempts: int,
        lockout_minutes: int,
    ) -> AdminUser | None:
        ...

    @abstractmethod
    async def commit(self) -> None:
        ...


@dataclass(frozen=True, slots=True)
class DashboardSummary:
    orders_today: int
    orders_last_7_days: int
    revenue_last_7_days_cents: int
    low_stock_count: int
    orders_by_status: dict[str, int]


class IAdminDashboardRepository(ABC):
    @abstractmethod
    async def get_summary(
        self,
        *,
        now: datetime,
        low_stock_threshold: int,
    ) -> DashboardSummary:
        ...
