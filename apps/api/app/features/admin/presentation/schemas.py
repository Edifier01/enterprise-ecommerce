"""Admin API schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminMeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: str
    permissions: list[str]
    created_at: datetime


class DashboardSummaryResponse(BaseModel):
    orders_today: int
    orders_last_7_days: int
    revenue_last_7_days_cents: int
    low_stock_count: int
    orders_by_status: dict[str, int]
