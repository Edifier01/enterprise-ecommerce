# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

`apps/` — Phase 24 application. Sprint 10 closed; ready for next Phase 24 epic.

---

## Current Feature

**Sprint 10 — Inventory Reservation/Deduction** ✅ **CLOSED** (2026-07-09). Next up: Phase 24 follow-on work (search API, order history UI, or other prioritized epic). Final YooKassa payment integration remains deferred to the final project gate per ADR-004.

---

## Active Agent

Implementation Agent (Sprint 10 closeout complete)

---

## Current Branch

Run `git branch --show-current` at session start

---

## Current Milestone

**Phase 24 — Internet Store Design** (~96%)

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
| Phase 24 application | 🔄 ~96% |
| Storefront Design S1–S6 | ✅ Complete |
| Sprint 7 — Category domain | ✅ Complete |
| Sprint 8 — Product variants & pricing display | ✅ Complete |
| Sprint 9 — Checkout foundation | ✅ Closed |
| Sprint 10 — Inventory reservation/deduction | ✅ Closed |
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
| Inventory ADR | `docs/adr/ADR-005-inventory-reservation-and-deduction.md` |
| Final payment ADR | `docs/adr/ADR-004-yookassa-final-payment-integration.md` |
| PM state | `.cursor/project-management/` |

---

## Last Updated

2026-07-09
