# Handoff

## Current Agent

Implementation Agent

## Completed Work

**Admin Panel Wave C (2026-07-16):**

### Catalog search
- `GET /admin/catalog/products?q=` — searches name, slug, variant SKU (all statuses)
- Admin catalog page search box with URL sync

### Variant CRUD UI
- `AdminVariantPanel` on product edit — list, edit, add variants
- Server actions: `createVariantAction`, `updateVariantAction`

### Category parent selector
- Parent dropdown on category create (indented hierarchy)
- Parent column in category table
- Indented category selects on product create/edit

### Media upload (local dev storage)
- `POST /api/v1/admin/media/upload` — JPEG/PNG/WebP/GIF up to 5 MB
- Files served at `/media/{filename}`; `AdminImageField` upload widget
- Config: `media_upload_dir`, `media_public_base_url`
- Added `python-multipart` dependency

### Tests
- 15/15 `test_admin_catalog.py` passed
- TypeScript check clean

## Files Changed

| Area | Key paths |
|------|-----------|
| Backend | `admin_catalog_repository.py`, `admin_router.py`, `admin_ports.py`, `media_router.py`, `config.py`, `main.py`, `requirements.txt` |
| Frontend | `admin-catalog-search.tsx`, `admin-variant-panel.tsx`, `admin-image-field.tsx`, `admin-category-select.tsx`, `category-options.ts`, `admin-category-panel.tsx`, `admin-product-form.tsx`, `admin-product-edit-form.tsx`, `catalog/page.tsx`, `admin-catalog.ts` |
| Contract | `openapi.yaml` |
| Tests | `test_admin_catalog.py` |

## Known Issues

- Upload uses local filesystem — swap to S3/CDN in production via same URL contract
- Variant delete not implemented (API or UI)

## Next Recommended Action

1. Production media: S3 presigned upload + CDN base URL
2. SMTP / YooKassa (release gates)

## How to Run

```bash
cd apps/api && pip install -r requirements.txt && python -m pytest tests/test_admin_catalog.py -q
cd apps/web && npm run dev
# Admin catalog: search, upload image, edit variants, category parent
```
