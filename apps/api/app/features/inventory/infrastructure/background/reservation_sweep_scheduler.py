"""Periodic background sweep for expired inventory reservations."""

import asyncio
import logging

from app.core.config import settings
from app.features.inventory.application.sweep_expired_reservations import (
    run_reservation_expiry_sweep,
)

logger = logging.getLogger(__name__)


async def reservation_sweep_loop(stop_event: asyncio.Event) -> None:
    interval = settings.inventory_reservation_sweep_interval_seconds
    logger.info(
        "Inventory reservation sweep started (interval=%ss)",
        interval,
    )
    while not stop_event.is_set():
        try:
            await run_reservation_expiry_sweep()
        except Exception:
            logger.exception("Inventory reservation sweep failed")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=interval)
        except TimeoutError:
            continue

    logger.info("Inventory reservation sweep stopped")


def start_reservation_sweep(stop_event: asyncio.Event) -> asyncio.Task | None:
    if not settings.inventory_reservation_sweep_enabled:
        logger.info("Inventory reservation sweep disabled by configuration")
        return None
    return asyncio.create_task(reservation_sweep_loop(stop_event), name="inventory-reservation-sweep")


async def stop_reservation_sweep(task: asyncio.Task | None, stop_event: asyncio.Event) -> None:
    if task is None:
        return
    stop_event.set()
    try:
        await task
    except asyncio.CancelledError:
        pass
