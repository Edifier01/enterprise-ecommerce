# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

`apps/web` + `apps/api` — admin panel Wave C complete.

---

## Current Feature

**Admin Panel Optimization Wave C** ✅ **COMPLETE**

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
| Admin Wave A–B | ✅ |
| Admin search (`?q=`) | ✅ |
| Variant CRUD UI | ✅ |
| Category parent selector | ✅ |
| Local media upload (`POST /admin/media/upload`) | ✅ |
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

2026-07-16 (admin Wave C)
