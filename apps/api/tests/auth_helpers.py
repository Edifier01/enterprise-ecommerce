"""Shared helpers for auth-related integration tests."""

import sqlalchemy as sa
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker


async def mark_user_email_verified(
    session_factory: async_sessionmaker,
    email: str,
) -> None:
    """Bypass email verification in non-auth integration tests."""
    async with session_factory() as session:
        await session.execute(
            sa.text(
                "UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE email = :email"
            ),
            {"email": email},
        )
        await session.commit()


async def register_and_login(
    client: AsyncClient,
    session_factory: async_sessionmaker,
    *,
    email: str,
    password: str = "secret123",
    payload: dict | None = None,
) -> str:
    from tests.auth_payloads import retail_register_payload

    register_body = payload or retail_register_payload(email, password=password)
    register_response = await client.post("/api/v1/auth/register", json=register_body)
    assert register_response.status_code == 201
    await mark_user_email_verified(session_factory, email)
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]
