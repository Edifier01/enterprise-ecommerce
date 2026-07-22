"""Admin media upload routes — local filesystem storage."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.config import settings
from app.features.admin.domain.entities import AdminUser
from app.features.admin.infrastructure.media.storage import MediaStorageError, MediaStorageService
from app.features.admin.presentation.dependencies import require_permission

router = APIRouter(prefix="/admin/media", tags=["admin"])


def get_media_storage_service() -> MediaStorageService:
    return MediaStorageService()


@router.post("/upload", operation_id="adminUploadMedia")
async def admin_upload_media(
    file: UploadFile = File(...),
    _admin: AdminUser = Depends(require_permission("catalog:write")),
    storage: MediaStorageService = Depends(get_media_storage_service),
) -> dict[str, str]:
    content_type = file.content_type or ""
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=422, detail="Empty file")
    if len(data) > settings.media_max_upload_bytes:
        raise HTTPException(status_code=422, detail="File too large")
    try:
        url = storage.store_bytes(data, content_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except MediaStorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Media upload failed") from exc
    return {"url": url}
