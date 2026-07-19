# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

`apps/web` — storefront mobile UX (Wave 1)

---

## Current Feature

**Mobile storefront Wave 3** — SW, CDN images, admin cards (2026-07-19)

---

## Active Agent

Implementation Agent

---

## Current Milestone

**Phase 24 — Internet Store Design** (~99%)

---

## Current Blockers

None.

---

## Progress Snapshot

| Area | Status |
|------|--------|
| Admin Wave A–C | ✅ |
| E2E smoke suite | ✅ 24/24 passing |
| Homepage search UX | ✅ |
| Mobile storefront Wave 1 | ✅ |
| Mobile storefront Wave 2 | ✅ |
| Mobile storefront Wave 3 | ✅ |
| Prod S3/CDN (production) | ⏳ Backlog |
| Prod SMTP / YooKassa | ⏳ Next gate |

---

## Important References

| Resource | Path |
|----------|------|
| Admin search | `GET /api/v1/admin/catalog/products?q=` |
| Media upload | `POST /api/v1/admin/media/upload` → `/media/{file}` |
| Variant panel | `apps/web/src/components/admin/catalog/admin-variant-panel.tsx` |
| Category hierarchy UI | `apps/web/src/lib/admin/category-options.ts` |
| Admin tests | `tests/test_admin_catalog.py` (15 tests) |

---

## Last Updated

2026-07-19 (mobile storefront Wave 1)
