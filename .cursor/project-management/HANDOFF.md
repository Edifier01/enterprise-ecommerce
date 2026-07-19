# Handoff

## Current Agent

Implementation Agent

## Completed Work

**Admin MS-only workflow + category delete fix (2026-07-19):**

- Blocked manual product creation: API `POST /admin/catalog/products` → 403; `/admin/catalog/new` redirects to MoySklad
- Admin catalog lists only `sync_source=moysklad` products; removed «Новый товар» button
- Category delete: backend rejects root with subcategories (422); UI shows errors; delete disabled when children exist
- Admin UX: sidebar «МойСклад» + «Очередь импорта» first; dashboard pending-imports widget; catalog links to import queue
- Cascading subcategory picker in import queue (prior session)
- Fixed «Редактировать» 404 → `/admin/catalog/{id}/edit`
- Tests: 25 pytest (admin catalog + MS workflow); E2E admin-catalog-smoke updated

## Files Changed

| Area | Key paths |
|------|-----------|
| Backend | `admin_router.py`, `admin_catalog_repository.py`, `admin_ports.py` |
| Frontend | `catalog/page.tsx`, `catalog/new/page.tsx`, `admin-category-panel.tsx`, `admin-catalog-category-picker.tsx`, `admin-dashboard.tsx`, `navigation.ts`, `catalog.ts`, `moysklad-import-panel.tsx`, `admin-cascading-category-select.tsx` |
| Tests | `test_admin_catalog.py`, `admin-catalog-smoke.spec.ts` |

## Known Issues

- Legacy manual products (`sync_source=manual`) may still exist in DB from seed/dev — hidden from admin catalog list but not deleted
- Legacy seed categories remain until admin deletes them via `/admin/catalog/categories`
- MoySklad credentials in `apps/api/.env`; restart API after env changes

## Next Recommended Action

1. Open `/admin/catalog/categories` — delete unused seed categories (subcategories first, then root)
2. Run MoySklad import on `/admin/integrations/moysklad`
3. Process `/admin/integrations/moysklad/import` — assign categories, edit, publish

## Workflow

```
МойСклад → импорт → очередь (без категории)
Создать категории в админке → назначить в очереди → редактировать → опубликовать
Ручное создание товаров отключено
```
