# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

`apps/` — Phase 24 application. Auth foundation complete (backend JWT + frontend session).

---

## Current Feature

Catalog — **Sprint 8 (Product variants & pricing display) complete** (variants, compare-at sale pricing, real primary-category filter). Stripe checkout next.

---

## Active Agent

Implementation Agent (Sprint 8 Variants & Pricing — verified complete)

---

## Current Branch

Run `git branch --show-current` at session start

---

## Current Milestone

**Phase 24 — Internet Store Design** (~85%)

---

## Current Blockers

None — run `alembic upgrade head` for PostgreSQL migrations 001–005, then `python -m scripts.seed_dev` before expecting live data

---

## Progress Snapshot

| Area | Status |
|------|--------|
| AI Platform (Phases 0–23, 25) | ✅ Complete (100%) |
| Sprint 5 — Auth Security Hardening | ✅ Complete |
| Sprint 6 — JWT Verification & Auth Foundation | ✅ Complete |
| Phase 24 application | 🔄 ~85% |
| Storefront Design S1 (tokens + config) | ✅ Complete |
| Storefront Design S2 (layout shell) | ✅ Complete |
| Storefront Design S3 (catalog components) | ✅ Complete |
| Storefront Design S4 (homepage + catalog pages) | ✅ Complete |
| Storefront Design S5 (PDP + search/cart placeholders) | ✅ Complete |
| Storefront Design S6 (auth RU + E2E smoke) | ✅ Complete |
| Sprint 7 — Category domain (backend + API + frontend) | ✅ Complete |
| Sprint 8 — Product variants & pricing display | ✅ Complete |

---

## Important References

| Resource | Path |
|----------|------|
| Audit report | `docs/AUDIT_REPORT_CURRENT_STATE.md` |
| Quick context | `PROJECT_BRAIN.md` |
| Auth dependencies | `apps/api/app/features/auth/presentation/dependencies.py` |
| Auth session (frontend) | `apps/web/src/lib/auth/session.ts` |
| OpenAPI | `openapi.yaml` |
| PM state | `.cursor/project-management/` |

---

## Last Updated

2026-07-08
