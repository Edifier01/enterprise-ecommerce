# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

`apps/api` + `apps/web` — MoySklad import queue workflow

---

## Current Feature

**MoySklad Import Queue** — per-product category assignment, visibility rules, stock threshold (2026-07-19)

---

## Active Agent

Implementation Agent

---

## Current Milestone

**Phase 24 — Internet Store Design** (~99%)

**Epic:** MoySklad ERP Integration — workflow update complete

---

## Current Blockers

None. Run live catalog import after API restart with MoySklad credentials in `apps/api/.env`.

---

## Progress Snapshot

| Area | Status |
|------|--------|
| Import queue tab | ✅ |
| Category delete | ✅ |
| Hide product | ✅ |
| Stock threshold `< 3` | ✅ |
| Folder mapping removed | ✅ |

---

## Important References

| Resource | Path |
|----------|------|
| Import queue UI | `/admin/integrations/moysklad/import` |
| Visibility rule | `storefront_visibility.py` |
| Stock threshold | `STOREFRONT_MIN_AVAILABLE_STOCK=3` |
| ADR | `docs/adr/ADR-010-moysklad-erp-integration.md` |

---

## Last Updated

2026-07-19 (MoySklad import queue workflow)
