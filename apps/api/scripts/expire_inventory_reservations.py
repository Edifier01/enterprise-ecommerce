"""One-shot CLI to expire overdue inventory reservations.

Usage:
    cd apps/api
    python -m scripts.expire_inventory_reservations
"""

import asyncio

from app.features.inventory.application.sweep_expired_reservations import (
    run_reservation_expiry_sweep,
)


async def main() -> None:
    expired_count = await run_reservation_expiry_sweep()
    print(f"Expired {expired_count} reservation(s)")


if __name__ == "__main__":
    asyncio.run(main())
