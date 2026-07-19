# Handoff

## Current Agent

Implementation Agent

## Completed Work

**Mobile storefront Wave 3 (2026-07-19):**

- **Service worker:** `public/sw.js` — precache shell, cache-first static, network-first navigation, offline fallback `/offline`
- **PWA register:** `PwaRegister` in root layout (production by default; `NEXT_PUBLIC_PWA_ENABLED` override)
- **Images:** `lib/store/product-image.ts` — CDN base URL, blur placeholders on product cards/PDP/admin catalog
- **Admin mobile cards:** orders, customers, inventory, catalog (`admin-mobile-card.tsx` primitives)
- **next.config:** `images.remotePatterns` for CDN/API; SW cache headers
- **Tests:** mobile admin customers card layout (+1 E2E)
- **tsc:** 0 errors

**Wave 1–2:** see prior HANDOFF / git history

## Files Changed

| Area | Key paths |
|------|-----------|
| PWA | `public/sw.js`, `components/pwa/pwa-register.tsx`, `app/offline/page.tsx`, `layout.tsx` |
| Images | `lib/store/product-image.ts`, `product-card.tsx`, `product-detail.tsx`, `product-grid.ts` |
| Admin mobile | `admin-mobile-card.tsx`, orders/customers/inventory tables, `catalog/page.tsx` |
| Config | `next.config.ts`, `.env.example` |
| Tests | `e2e/mobile-admin.spec.ts` |

## Known Issues

- SW disabled in dev unless `NEXT_PUBLIC_PWA_ENABLED=true` (avoids stale cache during development)
- CDN env vars must be set at **build time** for `remotePatterns`
- E2E not run locally — needs postgres on :5433

## Next Recommended Action

1. Set `NEXT_PUBLIC_CDN_URL` in production when S3/CDN is ready
2. Run full E2E on CI
3. Lighthouse mobile audit post-deploy
4. SMTP / YooKassa (release gates)

## How to Run

```bash
# Enable SW in dev
NEXT_PUBLIC_PWA_ENABLED=true npm run dev

# E2E
docker compose up -d postgres
cd apps/web && npm run test:e2e
```
