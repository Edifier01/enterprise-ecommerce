"""Import MoySklad catalog into local database.

Usage:
    cd apps/api
    alembic upgrade head
    python -m scripts.import_moysklad_catalog
"""

import asyncio

from app.core.database import async_session_factory
from app.features.integrations.moysklad.application.import_catalog import run_moysklad_catalog_import


async def main() -> None:
    async with async_session_factory() as session:
        result = await run_moysklad_catalog_import(session)
        await session.commit()

    print("MoySklad import complete")
    print(f"  products created: {result.products_created}")
    print(f"  products updated: {result.products_updated}")
    print(f"  variants created: {result.variants_created}")
    print(f"  variants updated: {result.variants_updated}")
    print(f"  stock rows applied: {result.stock_rows_applied}")
    if result.errors:
        print(f"  errors: {len(result.errors)}")
        for error in result.errors[:10]:
            print(f"    - {error}")


if __name__ == "__main__":
    asyncio.run(main())
