"""Magic-byte validation for uploaded admin images."""

_IMAGE_SIGNATURES: dict[str, tuple[tuple[bytes, int], ...]] = {
    "image/jpeg": ((b"\xff\xd8\xff", 0),),
    "image/png": ((b"\x89PNG\r\n\x1a\n", 0),),
    "image/gif": ((b"GIF87a", 0), (b"GIF89a", 0)),
    "image/webp": ((b"WEBP", 8),),
}


def validate_image_bytes(data: bytes, content_type: str) -> None:
    """Reject uploads whose content does not match the declared image type."""
    if not data:
        raise ValueError("Empty file")

    signatures = _IMAGE_SIGNATURES.get(content_type)
    if signatures is None:
        raise ValueError("Unsupported image type")

    if content_type == "image/webp":
        if len(data) < 12 or data[0:4] != b"RIFF" or data[8:12] != b"WEBP":
            raise ValueError("Invalid image file")
        return

    if not any(data.startswith(prefix) for prefix, _offset in signatures):
        raise ValueError("Invalid image file")
