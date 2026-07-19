"""Full MoySklad resync: catalog + stock + pending order exports."""

from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.integrations.moysklad.application.export_order import run_pending_order_exports
from app.features.integrations.moysklad.application.import_catalog import run_moysklad_catalog_import


@dataclass(slots=True)
class FullResyncResult:
    products_created: int = 0
    products_updated: int = 0
    variants_created: int = 0
    variants_updated: int = 0
    stock_rows_applied: int = 0
    order_exports_succeeded: int = 0
    errors: list[str] = field(default_factory=list)


async def run_full_resync(session: AsyncSession) -> FullResyncResult:
    """Pull catalog and stock from MS, then retry pending order exports."""
    result = FullResyncResult()

    catalog = await run_moysklad_catalog_import(session)
    result.products_created = catalog.products_created
    result.products_updated = catalog.products_updated
    result.variants_created = catalog.variants_created
    result.variants_updated = catalog.variants_updated
    result.stock_rows_applied = catalog.stock_rows_applied
    result.errors.extend(catalog.errors)

    result.order_exports_succeeded = await run_pending_order_exports(session)

    return result
