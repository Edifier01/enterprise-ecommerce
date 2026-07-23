# Handoff

## Current Agent

Implementation Agent

## Completed Work

**MoySklad stock sync fix — везде 0 шт. (2026-07-23):**

1. `MOYSKLAD_STORE_ID` нормализуется из URL/href → UUID (validator в config)
2. Запрос остатков: `groupBy=variant` + `filter=store=…` для нужного склада
3. Парсинг отчёта: product + variant rows, fallback `assortment.meta`
4. Sync не затирает остаток нулём, если вариант отсутствует в отчёте МС
5. Исправлена пагинация (offset по числу строк API, не по размеру map)
6. API «Обновить остатки» возвращает `stock_rows_skipped`, `stock_map_size`
7. Tests: 7 новых pytest в `test_moysklad_stock_sync.py`

**Root cause:** неверный формат `MOYSKLAD_STORE_ID` и/или отсутствие variant-level строк в отчёте → все варианты получали 0 при sync.

## Files Changed

| Area | Paths |
|------|-------|
| Backend | `moysklad/infrastructure/ids.py`, `http_client.py`, `sync_stock.py`, `config.py`, `admin_router.py`, `ports.py` |
| Tests | `tests/test_moysklad_stock_sync.py` |
| PM | `CURRENT_CONTEXT.md`, `PROJECT_STATUS.md`, `TASKS.md`, `HANDOFF.md` |

## Known Issues

- После деплоя нужен ручной «Обновить остатки» или full resync на prod
- Cron остатков по умолчанию выключен (`MOYSKLAD_SYNC_CRON_ENABLED=false`)
- Existing prod gallery 404 URLs — re-upload still pending (media fix)

## Next Recommended Action

1. **Deploy** stock sync fix to prod
2. Проверить `MOYSKLAD_STORE_ID` в `.env.production` — UUID нужного склада (не URL)
3. Админка → МойСклад → **«Обновить остатки»** — проверить колонку «Остаток (МС)»
4. При успехе: включить `MOYSKLAD_SYNC_CRON_ENABLED=true` для авто-sync
5. Deploy media upload fix (parallel track)
