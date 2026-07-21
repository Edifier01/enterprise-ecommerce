"""Client IP resolution tests."""

import pytest
from starlette.requests import Request

from app.core.client_ip import get_client_ip


def _request(
    *,
    client_host: str = "127.0.0.1",
    forwarded_for: str | None = None,
) -> Request:
    headers: list[tuple[bytes, bytes]] = []
    if forwarded_for is not None:
        headers.append((b"x-forwarded-for", forwarded_for.encode()))
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/",
        "headers": headers,
        "client": (client_host, 12345),
    }
    return Request(scope)


def test_get_client_ip_ignores_spoofed_xff_without_trusted_proxy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "trusted_proxy_hops", 0)
    request = _request(client_host="127.0.0.1", forwarded_for="203.0.113.1")
    assert get_client_ip(request) == "127.0.0.1"


def test_get_client_ip_uses_rightmost_xff_with_trusted_proxy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "trusted_proxy_hops", 1)
    request = _request(client_host="10.0.0.2", forwarded_for="203.0.113.50, 203.0.113.99")
    assert get_client_ip(request) == "203.0.113.99"
