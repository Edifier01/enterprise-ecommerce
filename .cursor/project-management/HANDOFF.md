# Handoff

## Current Agent

Implementation Agent

## Completed Work

**Storefront UX fixes (2026-07-23):**

Three user-reported issues on homepage and PDP:

1. **Cart quantity not visible** — badge on header cart icon (all breakpoints); mobile bottom nav badge; `cart:updated` event refreshes count after add/update/remove.
2. **SKU hidden on PDP** — removed SKU row from characteristics table; removed variant SKU line above purchase panel.
3. **Product photos missing** — public API `image_url` fallback chain: site `image_url` → gallery → `erp_image_url`; `/media/` paths resolve via API/CDN base; PLP uses gallery fallback.

**Tests:** `tests/test_product_serializers.py` (+2 unit tests, green).

## Files Changed

| Area | Paths |
|------|-------|
| Backend | `serializers.py`, `repository.py` |
| Frontend | `cart-header-summary.tsx`, `mobile-bottom-nav.tsx`, `cart-client.tsx`, `add-to-cart-button.tsx`, `product-specs-table.tsx`, `product-purchase-panel.tsx`, `product-image.ts`, `product-grid.ts` |
| New | `cart-events.ts`, `use-cart-summary.ts` |
| Tests | `tests/test_product_serializers.py` |

## Known Issues

- Prod gallery 404s from prior media upload bug still require re-upload (ops)
- MoySklad stock sync + admin product save fixes still pending prod deploy

## Next Recommended Action

1. **Deploy** storefront UX fixes to prod (`./scripts/deploy.sh`)
2. Verify cart badge updates after «Купить» on homepage/PDP
3. Confirm PDP shows MS placeholder or gallery photo for MS-synced products
4. Continue pending admin/MS deploy items if not yet on prod
