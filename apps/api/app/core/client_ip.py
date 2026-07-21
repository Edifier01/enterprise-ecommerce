"""Resolve the client IP for rate limits and access control."""

from starlette.requests import Request

from app.core.config import settings


def get_client_ip(request: Request) -> str:
    """Return the client IP, optionally parsing X-Forwarded-For behind trusted proxies.

    When ``trusted_proxy_hops`` is 0 (default), only the direct socket peer is used.
    This prevents clients from spoofing ``X-Forwarded-For`` to bypass IP allowlists or
    rate limits. In production behind a single reverse proxy (e.g. Caddy), set
    ``TRUSTED_PROXY_HOPS=1`` so the rightmost forwarded hop is treated as the client.
    """
    hops = settings.trusted_proxy_hops
    if hops <= 0:
        if request.client is not None:
            return request.client.host
        return "unknown"

    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        parts = [part.strip() for part in forwarded_for.split(",") if part.strip()]
        if parts:
            index = max(0, len(parts) - hops)
            return parts[index]

    if request.client is not None:
        return request.client.host
    return "unknown"
