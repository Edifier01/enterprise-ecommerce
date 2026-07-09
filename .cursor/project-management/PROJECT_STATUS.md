# Project Status

> Operational snapshot — "Where are we now?"
> Strategic phases remain in `PROJECT_ROADMAP.md`.

---

## Current Phase

**Phase 24 — Internet Store Design**

Platform phases 0–23 and Phase 25 complete. Sprints 1–10 closed. Sprint 9 checkout foundation formally closed and PM-synced 2026-07-09. Post-sprint: dev payment stub (ADR-006) + Playwright checkout E2E complete. Final YooKassa payment integration deferred to final project gate per ADR-004.

---

## Current Objective

Sprint 9 PM sync complete. Pick next Phase 24 epic: search API or order history UI per product priority.

---

## Current Sprint

**Sprint 9 — Checkout Foundation** ✅ **CLOSED** (2026-07-09, PM sync)

Delivered: cart/checkout bounded context, migration 006, Stripe PaymentIntent prototype, webhook order creation, storefront cart/checkout/confirmation UX, ADR-003/ADR-004. Quality gate at closeout: 48/48 pytest, ruff clean, tsc clean, browser shell smoke passed.

**Also closed:** Sprint 10 (inventory), dev payment stub (ADR-006), Playwright `checkout-stub-smoke.spec.ts`.

---

## Progress

**AI Development Platform (Phases 0–23, 25):** ✅ 100% complete

**Overall roadmap:** ~97% (25/26 phases — Phase 24 application in progress)

**Phase 24 (application):** ~97% (catalog + categories + variants/pricing + auth + checkout + inventory + dev payment stub + storefront UX + CI + E2E checkout smoke; final YooKassa payment gate pending)

---

## Completed Work

- [x] Sprint 1 — architecture hardening
- [x] Sprint 2 — quality baseline
- [x] Sprint 3 — CI/CD + Auth API + E2E baseline
- [x] Sprint 4 — AI Orchestration Upgrade
- [x] Sprint 5 — Auth Security Hardening
- [x] Sprint 6 — JWT Verification & Auth Foundation + storefront design
- [x] Sprint 7 — Category domain
- [x] Sprint 8 — Product variants & pricing display
- [x] Sprint 9 — Checkout foundation (formally closed + PM sync 2026-07-09)
- [x] Sprint 10 — Inventory reservation/deduction (formally closed 2026-07-09)
- [x] Dev payment stub — checkout without real provider (ADR-006, 2026-07-09)
- [x] Playwright checkout stub E2E smoke (2026-07-09)

---

## Active Work

- [ ] Search API or order history UI (recommended next per product priority)
- [ ] Final YooKassa payment integration and full payment smoke (deferred to final project gate)

---

## Blocked Work

None.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Empty product list without migration/seed | Medium | Run `alembic upgrade head` + seed data |
| E2E login shell test selector drift | Low | `storefront-smoke` login uses `heading`; `CardTitle` is not a heading role |
| Architecture drift | High | Read `DECISIONS.md` and ADRs before structural changes |
| Stripe-specific code remains temporarily | Medium | Final payment sprint migrates to YooKassa per ADR-004 |
| Reservation TTL sweep not automated | Medium | `expire_active_reservations` exists; add background job in ops sprint |

---

## Next Actions

1. Pick next Phase 24 epic per product priority (search API, order history UI).
2. At final project gate: implement YooKassa and run full browser payment smoke.

---

## Last Updated

2026-07-09 (Sprint 9 PM sync complete)

---

## Last Agent

PM sync (Sprint 9 formal closeout)
