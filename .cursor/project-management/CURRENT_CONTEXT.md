# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

`apps/` — Phase 24 application. Sprints 9–10 closed; dev payment stub complete.

---

## Current Feature

**Sprint 9 — Checkout Foundation** ✅ **CLOSED** (2026-07-09, PM sync complete). Post-sprint: ADR-006 payment stub + Playwright checkout E2E also complete. Next up: search API, order history UI, or other Phase 24 epic. Final YooKassa integration deferred per ADR-004.

---

## Active Agent

PM sync (Sprint 9 formal closeout)

---

## Current Branch

Run `git branch --show-current` at session start

---

## Current Milestone

**Phase 24 — Internet Store Design** (~97%)

---

## Current Blockers

None.

---

## Progress Snapshot

| Area | Status |
|------|--------|
| AI Platform (Phases 0–23, 25) | ✅ Complete (100%) |
| Sprint 5 — Auth Security Hardening | ✅ Complete |
| Sprint 6 — JWT Verification & Auth Foundation | ✅ Complete |
| Phase 24 application | 🔄 ~97% |
| Storefront Design S1–S6 | ✅ Complete |
| Sprint 7 — Category domain | ✅ Complete |
| Sprint 8 — Product variants & pricing display | ✅ Complete |
| Sprint 9 — Checkout foundation | ✅ Closed (PM sync 2026-07-09) |
| Sprint 10 — Inventory reservation/deduction | ✅ Closed |
| Dev payment stub (ADR-006) | ✅ Complete |
| Final payment integration — YooKassa | ⏳ Deferred to final project gate |

---

## Important References

| Resource | Path |
|----------|------|
| Audit report | `docs/AUDIT_REPORT_CURRENT_STATE.md` |
| Quick context | `PROJECT_BRAIN.md` |
| Auth dependencies | `apps/api/app/features/auth/presentation/dependencies.py` |
| Auth session (frontend) | `apps/web/src/lib/auth/session.ts` |
| OpenAPI | `openapi.yaml` |
| Checkout ADR | `docs/adr/ADR-003-stripe-checkout-payments.md` |
| Final payment ADR | `docs/adr/ADR-004-yookassa-final-payment-integration.md` |
| Inventory ADR | `docs/adr/ADR-005-inventory-reservation-and-deduction.md` |
| Payment stub ADR | `docs/adr/ADR-006-dev-payment-stub.md` |
| PM state | `.cursor/project-management/` |

---

## Last Updated

2026-07-09 (Sprint 9 PM sync complete)
