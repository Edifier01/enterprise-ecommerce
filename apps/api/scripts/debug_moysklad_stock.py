"""Debug MoySklad stock sync against live API (ops CLI)."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

from sqlalchemy import select

from app.core.config import settings
from app.core.database import async_session_factory
from app.features.catalog.infrastructure.persistence.models import ProductModel, ProductVariantModel
from app.features.integrations.moysklad.infrastructure.http_client import build_moysklad_client
from app.features.integrations.moysklad.application.sync_stock import run_moysklad_stock_sync


async def _load_full_stock_map(client) -> tuple[dict[str, int], int]:
    stock: dict[str, int] = {}
    offset = 0
    total = 0
    while True:
        batch, total, rows_returned = await client.list_stock_by_store(offset=offset, limit=1000)
        stock.update(batch)
        offset += rows_returned
        if offset >= total or rows_returned == 0:
            break
        await asyncio.sleep(0.25)
    return stock, total


async def _main(search: str | None, apply: bool) -> int:
    client = build_moysklad_client()
    if client is None:
        print("MOYSKLAD_API_TOKEN is not configured", file=sys.stderr)
        return 1

    store_id = settings.moysklad_store_id
    print(f"store_id={store_id!r}")

    try:
        stock_map, total = await _load_full_stock_map(client)
        non_zero = {k: v for k, v in stock_map.items() if v > 0}
        print(f"bulk_report: total={total} stock_map_size={len(stock_map)} non_zero={len(non_zero)}")
        sample = list(stock_map.items())[:8]
        print("stock_map_sample:", json.dumps(sample, ensure_ascii=False))
        if non_zero:
            print("non_zero_sample:", json.dumps(list(non_zero.items())[:8], ensure_ascii=False))

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
                        if apply:
                            direct_qty = await client.get_assortment_stock(ms_id)
                        else:
                            direct_qty = "(skipped — pass --apply to probe direct API)"
                        print(
                            f"  variant sku={variant.sku!r} ms_id={ms_id!r} "
                            f"bulk={bulk_qty} direct={direct_qty}"
                        )

        if apply:
            async with async_session_factory() as session:
                result = await run_moysklad_stock_sync(session)
                await session.commit()
                print(
                    "\nsync_result:",
                    f"applied={result.rows_applied}",
                    f"skipped={result.rows_skipped}",
                    f"map={result.stock_map_size}",
                )
                if result.errors:
                    print("errors:", result.errors[:5])
        else:
            print("\n(sync not run — pass --apply to write inventory from MoySklad)")
    finally:
        await client.close()

    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Debug MoySklad stock sync")
    parser.add_argument("search", nargs="?", help="Product name substring to inspect")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Run stock sync and optional direct API probes (slow; may rate-limit)",
    )
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_main(args.search, args.apply)))


if __name__ == "__main__":
    main()
