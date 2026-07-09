"""Reset checkout and inventory reservation state before Playwright E2E runs.

Clears carts, sessions, orders, and zeroes quantity_reserved so add-to-cart
succeeds against a shared dev database.
"""

import asyncio

from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.features.checkout.infrastructure.persistence.models import (
    CartLineModel,
    CartModel,
    CheckoutSessionLineModel,
    CheckoutSessionModel,
    OrderLineModel,
    OrderModel,
    OrderStatusHistoryModel,
    PaymentRecordModel,
    StripeWebhookEventModel,
)
from app.features.inventory.infrastructure.persistence.models import (
    InventoryItemModel,
    InventoryReservationModel,
)


async def reset_e2e_checkout_state() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        await session.execute(delete(OrderStatusHistoryModel))
        await session.execute(delete(OrderLineModel))
        await session.execute(delete(OrderModel))
        await session.execute(delete(PaymentRecordModel))
        await session.execute(delete(CheckoutSessionLineModel))
        await session.execute(delete(CheckoutSessionModel))
        await session.execute(delete(CartLineModel))
        await session.execute(delete(CartModel))
        await session.execute(delete(InventoryReservationModel))
        await session.execute(delete(StripeWebhookEventModel))
        await session.execute(
            update(InventoryItemModel).values(
                quantity_reserved=0,
                quantity_on_hand=50,
            )
        )
        await session.commit()

    await engine.dispose()


def main() -> None:
    asyncio.run(reset_e2e_checkout_state())
    print("E2E checkout state reset complete.")


if __name__ == "__main__":
    main()
