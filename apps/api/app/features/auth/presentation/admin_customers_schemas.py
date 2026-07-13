"""Pydantic schemas for admin customer API."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AdminCustomerSchema(BaseModel):
    id: UUID
    email: str
    is_wholesaler: bool
    created_at: datetime


class AdminCustomerListResponse(BaseModel):
    items: list[AdminCustomerSchema]
    total: int
    page: int
    limit: int


class AdminUpdateWholesalerRequest(BaseModel):
    is_wholesaler: bool
