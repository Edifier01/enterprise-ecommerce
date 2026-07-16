"""Admin media upload routes — local filesystem storage (S3-ready URL contract)."""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.config import settings
from app.features.admin.domain.entities import AdminUser
from app.features.admin.presentation.dependencies import require_permission

router = APIRouter(prefix="/admin/media", tags=["admin"])

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


@router.post("/upload", operation_id="adminUploadMedia")
async def admin_upload_media(
    file: UploadFile = File(...),
    _admin: AdminUser = Depends(require_permission("catalog:write")),
) -> dict[str, str]:
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported image type")

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=422, detail="Empty file")
    if len(data) > settings.media_max_upload_bytes:
        raise HTTPException(status_code=422, detail="File too large")

    upload_root = Path(settings.media_upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)

    extension = _EXTENSION_BY_TYPE[content_type]
    filename = f"{uuid.uuid4().hex}{extension}"
    destination = upload_root / filename
    destination.write_bytes(data)

    base = settings.media_public_base_url.rstrip("/")
    return {"url": f"{base}/{filename}"}
