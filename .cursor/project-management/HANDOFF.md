# Handoff

## Current Agent

Implementation Agent

## Completed Work

**Admin media upload & gallery display fix (2026-07-22):**

1. Upload API now returns site-relative URLs `/media/{file}` instead of absolute punycode URLs — works through Caddy on same domain
2. Verify-after-write on disk before returning URL; clearer errors on I/O failure
3. Video files rejected with explicit message (API magic-byte + declared MIME; client-side pre-check)
4. Admin gallery + product preview use `productImageRenderProps` with `unoptimized` for `/media/*`
5. RU translations for video/500 upload errors and generic `Internal server error` on save
6. Tests: 18 media pytest green (upload, serve via StaticFiles, video rejection)

**Root cause on prod:** uploaded file URL returned 404 — file missing from `media_uploads` volume (likely lost on deploy or volume not persisted). Code fix prevents bad URLs; ops must verify volume + re-upload photos.

## Files Changed

| Area | Paths |
|------|-------|
| Backend | `storage.py`, `validation.py`, `media_router.py` |
| Frontend | `admin-product-gallery.tsx`, `admin-product-edit-form.tsx`, `admin-image-field.tsx`, `product-image.ts`, `admin-catalog.ts`, `parse-api-error.ts` |
| Tests | `test_admin_media_validation.py`, `test_admin_catalog.py` |
| PM | `CURRENT_CONTEXT.md`, `PROJECT_STATUS.md`, `TASKS.md`, `HANDOFF.md` |

## Known Issues

- Existing prod gallery rows with absolute `https://…/media/…` URLs that 404 must be **re-uploaded** after deploy
- Video in product gallery not supported by design (images only)
- Bulk jobs in-process — API restart drops pending queue

## Next Recommended Action

1. **Deploy** media fix to prod
2. On VPS: `docker volume inspect enterprise-ecommerce_media_uploads` — confirm mount on API container
3. **Re-upload** product gallery photos for affected SKUs
4. Manual smoke: upload JPEG in admin gallery → preview visible → PDP shows photo
5. Continue UX roadmap — admin design system / loading states
