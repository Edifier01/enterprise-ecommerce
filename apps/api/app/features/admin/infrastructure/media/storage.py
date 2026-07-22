"""Media storage — local filesystem on the API server."""

from __future__ import annotations

import uuid
from pathlib import Path

from app.core.config import settings
from app.features.admin.infrastructure.media.validation import resolve_upload_content_type

_ALLOWED_CONTENT_TYPES = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    }
)
_EXTENSION_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
_MEDIA_URL_PREFIX = "/media"


class MediaStorageError(Exception):
    """Raised when a file could not be written or verified on disk."""


def validate_image_content_type(content_type: str) -> None:
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise ValueError("Unsupported image type")


def extension_for_content_type(content_type: str) -> str:
    validate_image_content_type(content_type)
    return _EXTENSION_BY_TYPE[content_type]


def build_media_public_path(filename: str) -> str:
    """Return a site-relative URL served by FastAPI StaticFiles at /media."""
    return f"{_MEDIA_URL_PREFIX}/{filename}"


class MediaStorageService:
    """Stores admin catalog images on local disk."""

    def store_bytes(self, data: bytes, content_type: str) -> str:
        resolved_type = resolve_upload_content_type(data, content_type or "")
        upload_root = Path(settings.media_upload_dir)
        upload_root.mkdir(parents=True, exist_ok=True)
        extension = extension_for_content_type(resolved_type)
        filename = f"{uuid.uuid4().hex}{extension}"
        destination = upload_root / filename
        destination.write_bytes(data)

        if not destination.is_file() or destination.stat().st_size != len(data):
            if destination.exists():
                destination.unlink(missing_ok=True)
            raise MediaStorageError("Uploaded file could not be verified on disk")

        return build_media_public_path(filename)
