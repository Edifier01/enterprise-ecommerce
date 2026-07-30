# Handoff

## Latest Session

Composer — storefront photo fix cherry-pick to master + deploy

## Completed Work

**Storefront photos not showing — prod verification + master merge (2026-07-30):**

Prod smoke confirmed: homepage and PDP show beige placeholder; SSR HTML contains `src="http://api:8000/media/..."`. API returns valid `/media/...` paths; files load at public URL.

Root cause: `resolveMediaPath()` on `master` used `getApiBase()` → `API_INTERNAL_URL=http://api:8000` during SSR.

Fix (commit c110238) cherry-picked to `master`:
1. `product-image.ts` — `getPublicSiteBase()` + `rewriteInternalAssetUrl()`
2. `docker-compose.prod.yml` + `Dockerfile.web` — `NEXT_PUBLIC_MEDIA_BASE_URL` build arg

## Files Changed

| Path | Change |
|------|--------|
| `apps/web/src/lib/store/product-image.ts` | public site base + internal URL rewrite |
| `docker-compose.prod.yml` | `NEXT_PUBLIC_MEDIA_BASE_URL` build arg |
| `docker/Dockerfile.web` | `NEXT_PUBLIC_MEDIA_BASE_URL` ARG/ENV |
| `.cursor/project-management/*` | PM state update |

## Test Run Results

- Prod browser smoke: ❌ placeholder on homepage + PDP (pre-deploy)
- `tsc --noEmit`: pending post-cherry-pick

## Known Issues

- **Requires web container rebuild + deploy** — fix is in Next.js bundle
- CI auto-deploy must complete before prod smoke passes

## Next Recommended Action

1. Confirm CI green + deploy completed (GitHub Actions)
2. Prod smoke: homepage «Кроссовки Элкland 178E» shows photo (not beige placeholder)
3. Prod smoke: PDP `/products/krossovki-elkland-178e` shows photo

---

## Previous Session

Composer — storefront product photo SSR URL fix (feature branch c110238)
