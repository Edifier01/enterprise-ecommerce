# Handoff

## Current Agent

Implementation Agent

## Completed Work

**Homepage recommendations (2026-07-16):**

- «Хиты сезона» → **«Рекомендации»**
- `sort=popular`: score = sum(order_lines.qty) за 90 дней (confirmed/shipped)
- Cold start fallback: in_stock + created_at DESC
- Catalog sort toolbar + `/catalog?sort=popular&in_stock=1`
- Tests: `test_recommendations.py` (2 tests)

**Admin categories (2026-07-16):**

- 2-level hierarchy validation (root → subcategory only)
- `revalidateTag('categories')` — instant storefront visibility after create/edit
- Admin UI: tree table, inline edit, «+ Категория» on catalog picker
- E2E: `admin-categories-smoke.spec.ts`; pytest 17/17 admin catalog

**Admin UX polish (2026-07-16):**

### Changes
- **Wholesaler (variant A):** removed manual «Назначить опт» toggle from `/admin/customers`; status read-only («Опт» / «Розница»); assignment only via `/register/wholesale`
- **Category-first catalog:** `/admin/catalog` shows category picker; products listed at `?category_id=` / `?uncategorized=1` / `?all=1`
- **RUB pricing:** admin forms use rubles (₽); API default currency `RUB`; dashboard/catalog format in ₽
- **Backend:** `GET /admin/catalog/products?category_id=` + `?uncategorized=true`; pytest +16/16 admin catalog

**E2E test stabilization (2026-07-16):**

### Root causes fixed
- **Cart line race**: concurrent `POST /cart/lines` caused `UniqueViolationError` on `(cart_id, variant_id)` — fixed with PostgreSQL `ON CONFLICT` upsert in checkout repository
- **Wholesaler cart isolation**: logged-in wholesaler shares DB cart across parallel tests — added `ensureCartEmpty()` helper and serial mode for wholesale specs
- **Admin catalog assertion**: slug appears in name + slug columns — use `getByRole('cell', { exact: true })`
- **Admin redirect bug**: `redirect()` caught in form action `catch` — moved outside try/catch in `admin-catalog.ts`

### E2E helpers (`apps/web/e2e/test-helpers.ts`)
- `loginAsAdmin`, `loginAsWholesaler`, `ensureCartEmpty`
- `addPrimaryProductToCart(page, scope?)` — scoped PDP button, POST wait, UI assert on cart page
- `productDetailPanel`, `pageSearchInput`, `productResultLink`

### Seed
- `seed_dev.py` refreshes `admin@example.com` and wholesaler credentials for E2E

### Quality gate
- **24/24 Playwright E2E passing** (`npm run test:e2e` with CI=true)
- **18/18 checkout pytest** passing after upsert change

## Files Changed

| Area | Key paths |
|------|-----------|
| Backend | `catalog/presentation/admin_router.py`, `admin_catalog_repository.py`, `admin_schemas.py` |
| Frontend | `admin/(panel)/catalog/page.tsx`, `admin-catalog-category-picker.tsx`, `admin-customers-table.tsx` |
| Frontend | `admin-product-form.tsx`, `admin-product-edit-form.tsx`, `admin-variant-panel.tsx`, `lib/admin/money.ts` |
| Frontend | `actions/admin-catalog.ts`, `admin-dashboard.tsx`, `lib/admin/catalog.ts` |
| Tests | `test_admin_catalog.py` (+category filter), `e2e/admin-catalog-smoke.spec.ts` |
| OpenAPI | `openapi.yaml` — admin list products filters |

## Known Issues

- Upload uses local filesystem — swap to S3/CDN in production via same URL contract
- Variant delete not implemented (API or UI)
- `CartHeaderSummary` loads cart once on mount — badge does not update after add-to-cart without navigation
- Multiple active user carts possible under concurrent create (mitigated in tests; consider DB partial unique index)

## Next Recommended Action

1. Production media: S3 presigned upload + CDN base URL
2. SMTP / YooKassa (release gates)
3. Optional: global admin search shortcut from category landing page

## How to Run

```bash
# E2E (starts API :8001 + web :3002, resets checkout DB)
cd apps/web && npm run test:e2e

# Dev stack
docker compose up -d postgres
cd apps/api && python scripts/seed_dev.py
cd apps/api && uvicorn app.main:app --reload --port 8000
cd apps/web && npm run dev
```
