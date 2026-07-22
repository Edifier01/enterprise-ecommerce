"""Schedule admin bulk jobs on the asyncio event loop."""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from app.features.admin.application.bulk_job_runner import run_admin_bulk_job

logger = logging.getLogger(__name__)

_running_tasks: set[asyncio.Task[None]] = set()


def schedule_admin_bulk_job(job_id: UUID) -> None:
    task = asyncio.create_task(_run_job(job_id), name=f"admin-bulk-job-{job_id}")
    _running_tasks.add(task)
    task.add_done_callback(_running_tasks.discard)


async def _run_job(job_id: UUID) -> None:
    try:
        await run_admin_bulk_job(job_id)
    except Exception:  # noqa: BLE001 — logged in runner
        logger.exception("Unhandled admin bulk job failure", extra={"job_id": str(job_id)})
