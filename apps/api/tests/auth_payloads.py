"""Shared auth test payloads."""

from __future__ import annotations


def retail_register_payload(email: str, password: str = "secret123") -> dict[str, str]:
    return {
        "email": email,
        "password": password,
        "first_name": "Тест",
        "last_name": "Пользователь",
    }


def wholesaler_register_payload(
    email: str,
    *,
    password: str = "secret123",
    inn: str = "123456789012",
    ogrnip: str = "123456789012345",
) -> dict[str, str]:
    return {
        "full_name": "ИП Тестов Тест Тестович",
        "edo_provider": "СБИС",
        "edo_id": "EDO-001",
        "phone": "+79001234567",
        "inn": inn,
        "ogrnip": ogrnip,
        "legal_address": "г. Москва, ул. Примерная, д. 1",
        "email": email,
        "password": password,
    }
