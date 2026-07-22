"""Validate admin catalog image URLs."""

from urllib.parse import urlparse

from app.core.config import settings

_BLOCKED_SCHEMES = frozenset({"javascript", "data", "vbscript", "file"})


def _validate_site_relative_path(normalized: str) -> str:
    """Allow same-origin asset paths (seed placeholders, static files)."""
    if not normalized.startswith("/") or normalized.startswith("//"):
        raise ValueError("invalid image URL path")
    if ".." in normalized or "\0" in normalized:
        raise ValueError("invalid image URL path")
    return normalized


def validate_admin_media_url(url: str) -> str:
    """Ensure image URLs are safe site-relative paths or absolute http(s) URLs."""
    normalized = url.strip()
    if not normalized:
        raise ValueError("image URL is required")

    if normalized.startswith("/"):
        return _validate_site_relative_path(normalized)

    parsed = urlparse(normalized)
    scheme = parsed.scheme.lower()

    if scheme in _BLOCKED_SCHEMES:
        raise ValueError("unsupported image URL scheme")
    if scheme not in {"http", "https"}:
        raise ValueError("image URL must use http or https")
    if settings.environment == "production" and scheme != "https":
        raise ValueError("image URL must use https in production")
    if not parsed.netloc:
        raise ValueError("image URL must include a host")
    if parsed.username or parsed.password:
        raise ValueError("invalid image URL")

    return normalized
