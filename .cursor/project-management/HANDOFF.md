# Handoff

## Latest Session

Grok 4.5 — ADR-015 Option D implementation + review fixes (2026-08-08)

## Completed Work

**ADR-015 ERP stock reconciliation (Accepted → implemented):**

1. Migration `021_erp_stock_reconciliation` — `quantity_awaiting_fulfillment`, drop `ck_inventory_items_on_hand_gte_reserved`, `orders.erp_fulfilled_at` + partial index, backfill.
2. Inventory — `commit_reserved(erp_managed)`, `settle_awaiting`, `set_awaiting`; missing row raises `InventoryItemMissingError`.
3. ERP payment commit: `reserved → awaiting`, mirror `on_hand` untouched; manual path still deducts `on_hand`.
4. `apply_stock` — mirror `on_hand = max(ms,0)` under `FOR UPDATE`; **no** `max(ms, reserved)`; on stock **drop**, settle `min(drop, awaiting)`.
5. Admin **SHIPPED** does **not** settle awaiting / `erp_fulfilled_at` (local ship ≠ ERP fulfillment). Cancel settles awaiting for ERP variants.
6. Reconcile — MS-deleted settle only; convergence sweep counts CONFIRMED+SHIPPED unfulfilled exports; cron logs errors.
7. Tests — `tests/test_erp_stock_reconciliation.py` **8 passed** (oversell timeline, stock-drop settle, mixed-status sweep, etc.).

## Files Changed

| Path | Change |
|------|--------|
| `docs/adr/ADR-015-erp-stock-reconciliation.md` | Accepted + defaults |
| `apps/api/alembic/versions/021_erp_stock_reconciliation.py` | new |
| `apps/api/app/features/inventory/**` | awaiting model |
| `apps/api/app/features/integrations/moysklad/**` | apply_stock + reconcile + cron log |
| `apps/api/app/features/checkout/application/update_admin_order_status.py` | no ship-settle |
| `apps/api/tests/test_erp_stock_reconciliation.py` | 8 tests |
| `.cursor/project-management/*` | ADR-015 status |

## Known Issues / residual

- Per-position MS shipped qty not wired (MVP = stock-drop settle + MS deleted).
- Export failure (L2/L7) still skips awaiting — ADR-016 + guest email next.
- Deploy: `alembic upgrade head` before first post-deploy stock sync.

## Next Recommended Action

1. Deploy migration `021` on staging/prod; smoke MS stock sync after a test sale.
2. `/start-feature` Wave A remainder: L3 payment retry + guest email + ADR-016 outbox.
3. Then YooKassa.

---

## Previous Session

Prod readiness audit 2026-08-08 — COMPLETED (verifier PASSED WITH NOTES).
