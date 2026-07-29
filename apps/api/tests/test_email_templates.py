"""Email template tests."""

from app.features.auth.infrastructure.email.templates import (
    build_password_reset_email,
    build_verification_email,
)


def test_build_verification_email_contains_link() -> None:
    subject, body_text, body_html = build_verification_email(
        verify_url="https://shop.example.com/verify-email?token=abc123"
    )
    assert subject == "Подтвердите email — Сухопут"
    assert "https://shop.example.com/verify-email?token=abc123" in body_text
    assert "https://shop.example.com/verify-email?token=abc123" in body_html
    assert "Подтвердить email" in body_html


def test_build_password_reset_email_contains_link() -> None:
    subject, body_text, body_html = build_password_reset_email(
        reset_url="https://shop.example.com/reset-password?token=xyz789"
    )
    assert subject == "Восстановление пароля — Сухопут"
    assert "https://shop.example.com/reset-password?token=xyz789" in body_text
    assert "Сбросить пароль" in body_html
