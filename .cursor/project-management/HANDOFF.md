# Handoff

## Latest Session

Composer — storefront product photo SSR URL fix

## Completed Work

**Storefront photos not showing (2026-07-30):**

Root cause: SSR used `getApiBase()` → `API_INTERNAL_URL=http://api:8000`, emitting browser-inaccessible image URLs (`http://api:8000/media/...`). Prod API and media files were fine.

1. `product-image.ts` — `getPublicSiteBase()` uses `NEXT_PUBLIC_API_URL` only for `/media/` and `/api/` paths.
2. Added `rewriteInternalAssetUrl()` — rewrites leaked `http://api:8000/...` absolute URLs.
3. `docker-compose.prod.yml` + `Dockerfile.web` — `NEXT_PUBLIC_MEDIA_BASE_URL=https://${DOMAIN}/media` build arg.

Prod smoke before fix: API returns `image_url: /media/a7413a6e...webp`, file loads at public URL, but homepage showed placeholder.

## Files Changed

| Path | Change |
|------|--------|
| `apps/web/src/lib/store/product-image.ts` | public site base + internal URL rewrite |
| `docker-compose.prod.yml` | `NEXT_PUBLIC_MEDIA_BASE_URL` build arg |
| `docker/Dockerfile.web` | `NEXT_PUBLIC_MEDIA_BASE_URL` ARG/ENV |

## Test Run Results

- `tsc --noEmit` (apps/web): ✅ clean

## Known Issues

- **Requires web container rebuild + deploy** — fix is in Next.js bundle, not hot-swappable.
- Auth email code + E2E admin-orders fix also pending deploy on same branch.

## Next Recommended Action

```bash
bash scripts/deploy.sh
```

Then verify homepage: «Кроссовки Элкland 178E» shows photo (not beige placeholder).

---

## Previous Session

Composer — email verification code + link flow (auth)
