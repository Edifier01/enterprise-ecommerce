"""Execute admin bulk jobs with per-item progress updates."""

from __future__ import annotations

import logging
from uuid import UUID

from collections.abc import Callable

from app.core.database import async_session_factory
from app.features.admin.domain.bulk_job_entities import (
    MAX_ADMIN_BULK_JOB_ERRORS,
    AdminBulkJobProgressUpdate,
    AdminBulkJobStatus,
    AdminBulkJobType,
)
from app.features.admin.infrastructure.persistence.bulk_job_repository import AdminBulkJobRepository
from app.features.catalog.domain.admin_ports import ProductNotFoundError, UpdateProductData
from app.features.catalog.domain.merchandising_readiness import (
    BLOCKER_LABELS_RU,
    get_moysklad_publish_blockers_for_product,
)
from app.features.catalog.infrastructure.persistence.admin_catalog_repository import (
    AdminCatalogRepository,
)
from app.features.catalog.infrastructure.persistence.product_image_repository import (
    ProductImageRepository,
)

logger = logging.getLogger(__name__)


def _summarize_skip_reasons(skip_reasons: dict[str, int]) -> str:
    parts: list[str] = []
    for code, count in skip_reasons.items():
        if count <= 0:
            continue
        label = BLOCKER_LABELS_RU.get(code, code)
        parts.append(f"{label}: {count}")
    return ", ".join(parts)


def _build_result_message(
    *,
    job_type: AdminBulkJobType,
    total: int,
    succeeded: int,
    failed: int,
    skipped: int,
    skip_reasons: dict[str, int],
) -> str:
    skip_summary = _summarize_skip_reasons(skip_reasons)
    skip_note = f" Пропущено: {skip_summary}." if skip_summary else ""

    if job_type is AdminBulkJobType.ASSIGN_CATEGORY:
        if succeeded == 0:
            return "Не удалось назначить категорию ни одному товару."
        if succeeded < total:
            return f"Категория назначена для {succeeded} из {total} товаров."
        return f"Категория назначена для {succeeded} товар(ов)."

    if succeeded == 0:
        if skipped > 0:
            return f"Не удалось опубликовать.{skip_note} Добавьте категорию, фото и фото по цветам."
        return "Не удалось опубликовать товары."

    if succeeded < total:
        return f"Опубликовано {succeeded} из {total}.{skip_note}"

    return f"Опубликовано {succeeded} товар(ов).{skip_note}"


async def run_admin_bulk_job(
    job_id: UUID,
    *,
    session_factory: Callable = async_session_factory,
) -> None:
    async with session_factory() as session:
        job_repo = AdminBulkJobRepository(session)
        job = await job_repo.get_by_id(job_id)
        if job is None:
            return
        if job.status is not AdminBulkJobStatus.PENDING:
            return
        await job_repo.mark_running(job_id)
        await session.commit()

    product_ids = [UUID(value) for value in job.payload.get("product_ids", [])]
    category_id = UUID(job.payload["category_id"]) if job.payload.get("category_id") else None

    processed = 0
    succeeded = 0
    failed = 0
    skipped = 0
    skip_reasons: dict[str, int] = {}
    errors: list[dict[str, str]] = []

    try:
        for product_id in product_ids:
            async with session_factory() as session:
                job_repo = AdminBulkJobRepository(session)
                catalog_repo = AdminCatalogRepository(session)
                image_repo = ProductImageRepository(session)

                try:
                    if job.job_type is AdminBulkJobType.ASSIGN_CATEGORY:
                        if category_id is None:
                            raise ValueError("category_id is required")
                        await catalog_repo.update_product(
                            product_id,
                            UpdateProductData(category_id=category_id),
                        )
                        succeeded += 1
                    elif job.job_type is AdminBulkJobType.PUBLISH_PRODUCTS:
                        product = await catalog_repo.get_product_by_id(product_id)
                        if product is None:
                            raise ProductNotFoundError(str(product_id))
                        if product.status == "active":
                            succeeded += 1
                        else:
                            images = await image_repo.list_for_product(product_id)
                            blockers = get_moysklad_publish_blockers_for_product(
                                product,
                                [img.option_color for img in images],
                                gallery_image_count=len(images),
                            )
                            if blockers:
                                skipped += 1
                                for blocker in blockers:
                                    skip_reasons[blocker] = skip_reasons.get(blocker, 0) + 1
                            else:
                                await catalog_repo.update_product(
                                    product_id,
                                    UpdateProductData(status="active"),
                                )
                                succeeded += 1
                    else:
                        raise ValueError(f"Unsupported job type: {job.job_type}")
                    await session.commit()
                except ProductNotFoundError:
                    failed += 1
                    if len(errors) < MAX_ADMIN_BULK_JOB_ERRORS:
                        errors.append(
                            {"product_id": str(product_id), "message": "Товар не найден."},
                        )
                    await session.rollback()
                except Exception as exc:  # noqa: BLE001 — per-item failure must not abort job
                    failed += 1
                    if len(errors) < MAX_ADMIN_BULK_JOB_ERRORS:
                        errors.append({"product_id": str(product_id), "message": str(exc)})
                    logger.exception("Bulk job item failed", extra={"job_id": str(job_id)})
                    await session.rollback()

                processed += 1
                await job_repo.update_progress(
                    job_id,
                    AdminBulkJobProgressUpdate(
                        processed=processed,
                        succeeded=succeeded,
                        failed=failed,
                        skipped=skipped,
                        skip_reasons=skip_reasons,
                        errors=errors,
                    ),
                )
                await session.commit()

        result_message = _build_result_message(
            job_type=job.job_type,
            total=job.total,
            succeeded=succeeded,
            failed=failed,
            skipped=skipped,
            skip_reasons=skip_reasons,
        )

        async with session_factory() as session:
            job_repo = AdminBulkJobRepository(session)
            await job_repo.mark_completed(job_id, result_message=result_message)
            await session.commit()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Bulk job failed", extra={"job_id": str(job_id)})
        async with session_factory() as session:
            job_repo = AdminBulkJobRepository(session)
            await job_repo.mark_failed(job_id, result_message=str(exc))
            await session.commit()
