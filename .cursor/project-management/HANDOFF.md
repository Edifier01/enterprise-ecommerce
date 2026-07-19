# Handoff

## Current Agent

Implementation Agent

## Completed Work

**MoySklad Import Queue Workflow (2026-07-19):**

- Removed category folder mapping UI/API — categories assigned per product in admin
- New admin tab `/admin/integrations/moysklad/import` for MS products without category
- MoySklad products hidden from storefront until `category_id` is set (`storefront_visibility.py`)
- `DELETE /api/v1/admin/catalog/categories/{id}` — products unlinked, MS products re-hidden
- Hide product action → `status=archived` on catalog list + import queue
- Stock threshold: available `< 3` → `in_stock=false` (`STOREFRONT_MIN_AVAILABLE_STOCK=3`)
- Status API: `pending_imports` count for uncategorized MS products
- Tests: `tests/test_moysklad_catalog_workflow.py` (6 tests)

## Files Changed

| Area | Key paths |
|------|-----------|
| Backend visibility/stock | `storefront_visibility.py`, `stock_availability.py`, `catalog_sync_repository.py`, `repository.py` |
| Admin API | `admin_router.py` (delete category, moysklad_pending filter), `moysklad/admin_router.py` |
| Frontend | `moysklad-import-panel.tsx`, `moysklad-integration-panel.tsx`, `import/page.tsx`, `admin-category-panel.tsx`, `admin-product-hide-button.tsx` |
| Config | `.env.example` — `STOREFRONT_MIN_AVAILABLE_STOCK=3` |
| Tests | `test_moysklad_catalog_workflow.py` |

## Known Issues

- MoySklad credentials must live in `apps/api/.env` (that file takes precedence over repo root `.env`)
- Restart API after env changes
- OpenAPI still lists removed category-mapping paths until next sync (optional cleanup)

## Next Recommended Action

1. Restart API and confirm «Настроено: да» on `/admin/integrations/moysklad`
2. Click «Импорт каталога и остатков»
3. Open `/admin/integrations/moysklad/import` — assign categories, edit, publish
4. Register webhooks after first import (if public URL available)

## Import Workflow

```
MS import → draft, no category → hidden from storefront
Admin assigns category on import tab → still draft until published
Admin adds photos + status=active → visible on storefront (if stock ≥ 3)
Delete category → products lose category → MS products hidden again
```
