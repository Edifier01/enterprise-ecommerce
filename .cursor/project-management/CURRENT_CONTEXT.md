# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

`apps/api` + `apps/web` — MoySklad Phase 6 complete

---

## Current Feature

**MoySklad ERP Integration** — Phases 1–6 done (2026-07-19)

---

## Active Agent

Implementation Agent

---

## Current Milestone

**Phase 24 — Internet Store Design** (~99%)

**Epic:** MoySklad ERP Integration — **complete** (pending live DB validation)

---

## Current Blockers

None. Live MS validation requires Docker/Postgres + credentials.

---

## Progress Snapshot

| Area | Status |
|------|--------|
| Phase 1–5 | ✅ |
| Phase 6 Operations | ✅ |

---

## Important References

| Resource | Path |
|----------|------|
| Returns sync | `sync_order_return.py` + webhook `customerorder` |
| Full resync | `POST /admin/integrations/moysklad/sync/resync` |
| E2E seed | `scripts/seed_moysklad_e2e.py` |
| ADR | `docs/adr/ADR-010-moysklad-erp-integration.md` |

---

## Last Updated

2026-07-19 (MoySklad Phase 6)
