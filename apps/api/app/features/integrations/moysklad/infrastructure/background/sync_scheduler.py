"""Periodic background stock sync from MoySklad (read-only pull)."""

import asyncio
import logging

from app.core.config import settings
from app.core.database import async_session_factory
from app.features.integrations.moysklad.application.export_order import run_pending_order_exports
from app.features.integrations.moysklad.application.reconcile_stock import run_erp_stock_reconciliation
from app.features.integrations.moysklad.application.sync_stock import run_moysklad_stock_sync

logger = logging.getLogger(__name__)


async def moysklad_sync_loop(stop_event: asyncio.Event) -> None:
    interval = settings.moysklad_sync_cron_interval_seconds
    logger.info("MoySklad stock sync cron started (interval=%ss)", interval)
    while not stop_event.is_set():
        try:
            async with async_session_factory() as session:
                await run_moysklad_stock_sync(session)
                reconcile_result = await run_erp_stock_reconciliation(session)
                if reconcile_result.errors:
                    logger.error(
                        "erp_stock_reconcile_cron_errors count=%s errors=%s",
                        len(reconcile_result.errors),
                        reconcile_result.errors[:20],
                    )
                elif reconcile_result.orders_settled or reconcile_result.variants_swept:
                    logger.info(
                        "erp_stock_reconcile_cron_ok checked=%s settled=%s swept=%s",
                        reconcile_result.orders_checked,
                        reconcile_result.orders_settled,
                        reconcile_result.variants_swept,
                    )
                await run_pending_order_exports(session)
                await session.commit()
        except Exception:
            logger.exception("MoySklad stock sync cron failed")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=interval)
        except TimeoutError:
            continue

    logger.info("MoySklad stock sync cron stopped")


def start_moysklad_sync_cron(stop_event: asyncio.Event) -> asyncio.Task | None:
    if not settings.moysklad_sync_cron_enabled:
        logger.info("MoySklad sync cron disabled by configuration")
        return None
    if not settings.moysklad_api_token.get_secret_value() or not settings.moysklad_store_id:
        logger.info("MoySklad sync cron disabled — token or store not configured")
        return None
    return asyncio.create_task(moysklad_sync_loop(stop_event), name="moysklad-stock-sync")


async def stop_moysklad_sync_cron(task: asyncio.Task | None, stop_event: asyncio.Event) -> None:
    if task is None:
        return
    stop_event.set()
    try:
        await task
    except asyncio.CancelledError:
        pass
