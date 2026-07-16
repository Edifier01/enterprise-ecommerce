# Handoff

## Current Agent

Implementation Agent

## Completed Work

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
| Backend | `checkout/infrastructure/persistence/repository.py` (ON CONFLICT upsert, cart lookup limit) |
| Backend | `scripts/seed_dev.py` |
| Frontend | `app/actions/admin-catalog.ts` |
| E2E | `e2e/test-helpers.ts`, all `e2e/*-smoke.spec.ts` |
| Homepage UX | `page.tsx`, `catalog-search-form.tsx`, `search/page.tsx` |

## Known Issues

- Upload uses local filesystem — swap to S3/CDN in production via same URL contract
- Variant delete not implemented (API or UI)
- `CartHeaderSummary` loads cart once on mount — badge does not update after add-to-cart without navigation
- Multiple active user carts possible under concurrent create (mitigated in tests; consider DB partial unique index)

## Next Recommended Action

1. Production media: S3 presigned upload + CDN base URL
2. SMTP / YooKassa (release gates)
3. Optional: refresh cart badge after add-to-cart (client-side event or re-fetch)

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
