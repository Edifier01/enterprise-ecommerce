"""Magic-byte validation for uploaded admin images."""

_IMAGE_SIGNATURES: dict[str, tuple[tuple[bytes, int], ...]] = {
    "image/jpeg": ((b"\xff\xd8\xff", 0),),
    "image/png": ((b"\x89PNG\r\n\x1a\n", 0),),
    "image/gif": ((b"GIF87a", 0), (b"GIF89a", 0)),
    "image/webp": ((b"RIFF", 0),),
}

_DECLARED_TYPE_ALIASES: dict[str, str] = {
    "image/jpg": "image/jpeg",
    "image/pjpeg": "image/jpeg",
    "application/octet-stream": "",
}


def _matches_signature(data: bytes, prefix: bytes, offset: int) -> bool:
    end = offset + len(prefix)
    return len(data) >= end and data[offset:offset + len(prefix)] == prefix


def _matches_content_type(data: bytes, content_type: str) -> bool:
    signatures = _IMAGE_SIGNATURES.get(content_type)
    if signatures is None:
        return False
    if content_type == "image/webp":
        return len(data) >= 12 and data[0:4] == b"RIFF" and data[8:12] == b"WEBP"
    return any(_matches_signature(data, prefix, offset) for prefix, offset in signatures)


def detect_image_content_type(data: bytes) -> str | None:
    """Detect supported image type from file contents (ignore client MIME)."""
    for content_type in ("image/jpeg", "image/png", "image/gif", "image/webp"):
        if _matches_content_type(data, content_type):
            return content_type
    return None


def normalize_declared_content_type(content_type: str) -> str:
    normalized = content_type.strip().lower()
    return _DECLARED_TYPE_ALIASES.get(normalized, normalized)


def resolve_upload_content_type(data: bytes, declared_content_type: str) -> str:
    """Resolve canonical image MIME type for storage, preferring magic-byte detection."""
    if not data:
        raise ValueError("Empty file")

    detected = detect_image_content_type(data)
    if detected is not None:
        return detected

    declared = normalize_declared_content_type(declared_content_type)
    if declared in _IMAGE_SIGNATURES and _matches_content_type(data, declared):
        return declared

    if declared and declared not in _IMAGE_SIGNATURES and declared != "":
        raise ValueError("Unsupported image type. Use JPEG, PNG, WebP, or GIF.")

    raise ValueError("Invalid image file. Use JPEG, PNG, WebP, or GIF.")


def validate_image_bytes(data: bytes, content_type: str) -> None:
    """Reject uploads whose content is not a supported image format."""
    resolve_upload_content_type(data, content_type)
