"""Pydantic schemas for auth API."""

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

_INN_PATTERN = re.compile(r"^\d{12}$")
_OGRNIP_PATTERN = re.compile(r"^\d{15}$")


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class WholesalerRegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    edo_provider: str = Field(min_length=1, max_length=255)
    edo_id: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=1, max_length=32)
    inn: str = Field(min_length=12, max_length=12)
    ogrnip: str = Field(min_length=15, max_length=15)
    legal_address: str = Field(min_length=1, max_length=500)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("inn")
    @classmethod
    def validate_inn(cls, value: str) -> str:
        if not _INN_PATTERN.match(value):
            raise ValueError("INN must be exactly 12 digits")
        return value

    @field_validator("ogrnip")
    @classmethod
    def validate_ogrnip(cls, value: str) -> str:
        if not _OGRNIP_PATTERN.match(value):
            raise ValueError("OGRNIP must be exactly 15 digits")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class RegisterResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    is_wholesaler: bool
    created_at: datetime
