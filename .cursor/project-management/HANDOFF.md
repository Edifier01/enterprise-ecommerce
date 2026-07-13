# Handoff

## Current Agent

Implementation Agent (Sprint E closeout)

## Completed Work

**Sprint E — Wholesale Pricing (2026-07-10):**

- Dual retail/wholesale prices per SKU (`wholesale_price_cents` on variants)
- Customer `is_wholesaler` flag with admin grant/revoke
- Server-side `resolve_variant_price()` in cart/checkout
- API visibility: wholesale omitted for non-wholesalers (list/search/detail)
- Cart revalidation on GET + login merge reprices guest cart to wholesaler tier
- HTTP 409 when wholesaler buys variant without wholesale price
- Storefront: dual-price on PDP, catalog cards, account badge
- Admin: customers page, catalog wholesale fields
- Tests: 115/115 pytest green; `tsc --noEmit` clean
- E2E: `wholesale-pricing-smoke.spec.ts`, `wholesale-checkout-smoke.spec.ts`

## Files Changed

| Area | Key paths |
|------|-----------|
| Schema | `alembic/versions/010_add_wholesale_pricing.py` |
| Domain | `catalog/domain/pricing.py`, `checkout/domain/entities.py` |
| API | `catalog/presentation/router.py`, `serializers.py`, `auth/presentation/admin_customers_router.py` |
| Checkout | `cart_service.py`, `checkout/presentation/router.py`, `auth/presentation/router.py` |
| Frontend | `product-card.tsx`, `product-grid.ts`, catalog/search pages, admin customers |
| Tests | `test_wholesale_pricing.py`, `test_admin_catalog.py`, E2E specs |
| OpenAPI | `price_tier` documented in `product_snapshot` |

## Known Issues

- Admin cancel does not trigger payment refund (deferred to YooKassa gate)
- MFA for admin not implemented (production gate)
- Dev admin email should be `admin@example.com` (EmailStr rejects `admin@localhost`)

## Next Recommended Action

**Start Final YooKassa Payment Integration** — see `TASKS.md` Final Project Gate section.

## How to Run

```bash
docker compose up -d postgres
cd apps/api && alembic upgrade head && uvicorn app.main:app --reload --port 8000
cd apps/web && npm run dev
# Admin: http://localhost:3000/admin/login — admin@example.com / admin12345
# Wholesaler test: wholesaler@example.com / wholesale12345
```
