"""Debug MoySklad stock sync against live API (ops CLI)."""

from __future__ import annotations

import asyncio
import json
import sys

from sqlalchemy import select

from app.core.config import settings
from app.core.database import async_session_factory
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.integrations.moysklad.infrastructure.http_client import build_moysklad_client
from app.features.integrations.moysklad.application.sync_stock import run_moysklad_stock_sync


async def _main(search: str | None) -> int:
    client = build_moysklad_client()
    if client is None:
        print("MOYSKLAD_API_TOKEN is not configured", file=sys.stderr)
        return 1

    store_id = settings.moysklad_store_id
    print(f"store_id={store_id!r}")

    try:
        stock_map, total, rows_count = await client.list_stock_by_store(offset=0, limit=1000)
        print(f"bulk_report: rows={rows_count} total={total} stock_map_size={len(stock_map)}")
        sample = list(stock_map.items())[:8]
        print("stock_map_sample:", json.dumps(sample, ensure_ascii=False))

        if search:
            async with async_session_factory() as session:
                products = (
                    await session.scalars(
                        select(ProductModel).where(ProductModel.name.ilike(f"%{search}%")).limit(5)
                    )
                ).all()
                for product in products:
                    variants = (
                        await session.scalars(
                            select(ProductVariantModel).where(
                                ProductVariantModel.product_id == product.id
                            )
                        )
                    ).all()
                    print(f"\nproduct: {product.name!r}")
                    print(f"  moysklad_product_id={product.moysklad_product_id}")
                    for variant in variants:
                        ms_id = variant.moysklad_variant_id or f"product:{product.moysklad_product_id}"
                        bulk_qty = stock_map.get(ms_id)
                        if bulk_qty is None and ms_id.startswith("product:"):
                            bulk_qty = stock_map.get(ms_id.removeprefix("product:"))
                        direct_qty = await client.get_assortment_stock(ms_id)
                        print(
                            f"  variant sku={variant.sku!r} ms_id={ms_id!r} "
                            f"bulk={bulk_qty} direct={direct_qty}"
                        )

        async with async_session_factory() as session:
            result = await run_moysklad_stock_sync(session)
            await session.commit()
            print(
                "\nsync_result:",
                f"applied={result.rows_applied}",
                f"skipped={result.rows_skipped}",
                f"direct={result.rows_fetched_direct}",
                f"map={result.stock_map_size}",
            )
            if result.errors:
                print("errors:", result.errors[:5])
    finally:
        await client.close()

    return 0


def main() -> None:
    search = sys.argv[1] if len(sys.argv) > 1 else None
    raise SystemExit(asyncio.run(_main(search)))


if __name__ == "__main__":
    main()
