"""Media storage — local filesystem on the API server."""

from __future__ import annotations

import uuid
from pathlib import Path

from app.core.config import settings
from app.features.admin.infrastructure.media.validation import validate_image_bytes

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


def validate_image_content_type(content_type: str) -> None:
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise ValueError("Unsupported image type")


def extension_for_content_type(content_type: str) -> str:
    validate_image_content_type(content_type)
    return _EXTENSION_BY_TYPE[content_type]


class MediaStorageService:
    """Stores admin catalog images on local disk."""

    def store_bytes(self, data: bytes, content_type: str) -> str:
        validate_image_content_type(content_type)
        validate_image_bytes(data, content_type)
        upload_root = Path(settings.media_upload_dir)
        upload_root.mkdir(parents=True, exist_ok=True)
        extension = extension_for_content_type(content_type)
        filename = f"{uuid.uuid4().hex}{extension}"
        destination = upload_root / filename
        destination.write_bytes(data)
        base = settings.media_public_base_url.rstrip("/")
        return f"{base}/{filename}"
