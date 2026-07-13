"""Expire overdue active inventory reservations."""

import logging
from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import settings
from app.features.inventory.application.inventory_service import InventoryService
from app.features.inventory.infrastructure.persistence.repository import InventoryRepository

logger = logging.getLogger(__name__)


def build_inventory_service(session: AsyncSession) -> InventoryService:
    return InventoryService(
        InventoryRepository(session),
        reservation_ttl=timedelta(minutes=settings.inventory_reservation_ttl_minutes),
    )


async def sweep_expired_reservations(session_factory: async_sessionmaker) -> int:
    """Release expired active reservations in a dedicated DB session."""
    async with session_factory() as session:
        service = build_inventory_service(session)
        try:
            expired_count = await service.expire_active_reservations()
            await session.commit()
            return expired_count
        except Exception:
            await session.rollback()
            raise


async def run_reservation_expiry_sweep() -> int:
    from app.core.database import async_session_factory

    expired_count = await sweep_expired_reservations(async_session_factory)
    if expired_count:
        logger.info("Expired %s inventory reservation(s)", expired_count)
    return expired_count
