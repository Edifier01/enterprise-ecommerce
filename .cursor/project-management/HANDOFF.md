# Handoff

## Current Agent

Implementation Agent

## Completed Work

**Own-brand cleanup + search page filters (2026-07-15):**

- Removed brand filter from API, facets, OpenAPI, and frontend (single own brand «Сухопут»)
- Trust bar: «Проверенные бренды» → «Собственный бренд»
- Product specs table: no «Бренд» row
- Extended `GET /api/v1/products/search` with same filter params as catalog list
- Extended `GET /api/v1/products/facets` with optional `q` for search scope
- `/search` page: URL-synced filters via shared `FilteredProductList`
- Backend tests: 14 passed (`test_product_filters.py`, `test_search.py`)
- `tsc --noEmit` clean

## Files Changed

| Area | Key paths |
|------|-----------|
| Backend domain | `product_list_filters.py`, `variant_filter.py`, `ports.py` |
| Backend infra | `repository.py`, `search_products.py`, `get_product_facets.py` |
| Backend API | `router.py`, `schemas.py` |
| Backend tests | `tests/test_product_filters.py` |
| Frontend | `catalog-query.ts`, `catalog-filters.ts`, `api.ts`, `filtered-product-list.tsx`, `catalog-filters-panel.tsx`, `search/page.tsx`, `catalog/[slug]/page.tsx` |
| Copy / UX | `site-config.ts`, `product-specs-table.tsx`, `homepage.spec.ts` |
| Contract | `openapi.yaml` |

## Known Issues

- Facets reflect full category/search scope, not dynamic counts per active filter
- Search URL keeps `q` + filter params; changing filters preserves query

## Next Recommended Action

1. Real product/category photography
2. SMTP / YooKassa (TASKS.md gates)
3. Optional: dynamic facet counts when filters applied

## How to Run

```bash
cd apps/api && python -m pytest tests/test_product_filters.py tests/test_search.py -q
cd apps/web && npm run dev
# Category: /catalog/odezhda?in_stock=1&size=M&sort=price-asc
# Search:   /search?q=куртка&in_stock=1&color=olive
```
