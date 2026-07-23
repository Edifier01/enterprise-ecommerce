# Handoff

## Current Agent

Implementation Agent

## Completed Work

**MoySklad stock sync — direct fetch fallback (2026-07-23):**

Prod confirmed bulk `/report/stock/all?filter=storeId=…` returns 3197 rows but **all quantity=0**, while per-product `get_assortment_stock(filter=product=…)` returns correct values (4, 5, 22, etc.).

**Fix:** `SyncMoySkladStockUseCase` now:
1. Tries bulk report first (fast path when `non_zero > 0`)
2. If bulk is all zeros → falls back to **catalog-scoped direct fetch** per unique `moysklad_product_id` + real variant IDs
3. Throttled via `MOYSKLAD_STOCK_SYNC_REQUEST_DELAY_SECONDS` (default 0.2s)
4. Logs `stock_non_zero`, `rows_fetched_direct`; sets `last_error` when sync finds 0 non-zero quantities

## Files Changed

| Area | Paths |
|------|-------|
| Backend | `sync_stock.py`, `config.py` |
| Tests | `test_moysklad_stock_sync.py` (+ fallback test) |
| Ops | `scripts/debug_moysklad_stock.py` (shows `non_zero`, `direct_fetches`) |
| Config | `.env.example` |

## Known Issues

- Direct fetch ~0.2s × N products → full sync may take 1–3 min for ~400 products (within 600s cron interval)
- Admin still shows 0 until `--apply` or «Обновить остатки» after deploy
- Docker cache import warnings on deploy are harmless (local `:previous` tags)

## Next Recommended Action

1. **Commit + deploy** to prod (`./scripts/deploy.sh`)
2. Run debug with apply:
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml exec api \
     python -m scripts.debug_moysklad_stock "Баллистика" --apply
   ```
3. Expect: `non_zero > 0`, `direct_fetches > 0`, Баллистика Лист=4, Сухопут=5
4. Verify admin «Остаток (МС)» column
5. Enable `MOYSKLAD_SYNC_CRON_ENABLED=true` once verified
