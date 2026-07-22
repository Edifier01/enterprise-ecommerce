"""Tests for admin media URL and upload validation."""

import pytest

from app.features.admin.infrastructure.media.validation import (
    detect_image_content_type,
    is_likely_video_bytes,
    reject_video_upload,
    resolve_upload_content_type,
    validate_image_bytes,
)
from app.features.catalog.domain.media_url import validate_admin_media_url


def test_validate_admin_media_url_accepts_https() -> None:
    url = validate_admin_media_url("https://cdn.example.com/catalog/photo.jpg")
    assert url == "https://cdn.example.com/catalog/photo.jpg"


def test_validate_admin_media_url_accepts_site_relative_path() -> None:
    url = validate_admin_media_url("/images/product-placeholder.svg")
    assert url == "/images/product-placeholder.svg"


def test_validate_admin_media_url_accepts_uploaded_media_path() -> None:
    url = validate_admin_media_url("/media/fe52edb5a77941df867174c847854f4a.webp")
    assert url == "/media/fe52edb5a77941df867174c847854f4a.webp"


def test_validate_admin_media_url_rejects_protocol_relative_path() -> None:
    with pytest.raises(ValueError, match="path"):
        validate_admin_media_url("//evil.example/photo.jpg")


def test_validate_admin_media_url_rejects_path_traversal() -> None:
    with pytest.raises(ValueError, match="path"):
        validate_admin_media_url("/images/../secret.png")


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


def test_detect_image_content_type_from_png_bytes() -> None:
    png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
    assert detect_image_content_type(png_header) == "image/png"


def test_resolve_upload_content_type_sniffs_when_declared_mime_wrong() -> None:
    png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
    assert resolve_upload_content_type(png_header, "image/jpeg") == "image/png"


def test_resolve_upload_content_type_accepts_octet_stream() -> None:
    png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
    assert resolve_upload_content_type(png_header, "application/octet-stream") == "image/png"


def test_is_likely_video_bytes_detects_mp4_container() -> None:
    mp4_header = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 8
    assert is_likely_video_bytes(mp4_header) is True


def test_reject_video_upload_by_declared_mime() -> None:
    with pytest.raises(ValueError, match="Video files are not supported"):
        reject_video_upload(data=b"hello", declared_content_type="video/mp4")


def test_resolve_upload_content_type_rejects_video_bytes() -> None:
    mp4_header = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 8
    with pytest.raises(ValueError, match="Video files are not supported"):
        resolve_upload_content_type(mp4_header, "application/octet-stream")
