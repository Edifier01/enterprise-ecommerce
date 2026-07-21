"""Tests for admin media URL and upload validation."""

import pytest

from app.features.admin.infrastructure.media.validation import validate_image_bytes
from app.features.catalog.domain.media_url import validate_admin_media_url


def test_validate_admin_media_url_accepts_https() -> None:
    url = validate_admin_media_url("https://cdn.example.com/catalog/photo.jpg")
    assert url == "https://cdn.example.com/catalog/photo.jpg"


def test_validate_admin_media_url_rejects_javascript_scheme() -> None:
    with pytest.raises(ValueError, match="scheme"):
        validate_admin_media_url("javascript:alert(1)")


def test_validate_admin_media_url_rejects_data_uri() -> None:
    with pytest.raises(ValueError, match="scheme"):
        validate_admin_media_url("data:image/png;base64,abc")


def test_validate_image_bytes_accepts_png() -> None:
    png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
    validate_image_bytes(png_header, "image/png")


def test_validate_image_bytes_rejects_mismatch() -> None:
    with pytest.raises(ValueError, match="Invalid image file"):
        validate_image_bytes(b"not-an-image", "image/png")
