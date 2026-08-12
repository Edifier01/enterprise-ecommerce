# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

**ECOMMERCE UX V2 + Admin UX v2** — Phase 12 shipped (2026-08-11).  
Admin UX v2 plan complete (Phases 0–12). Parallel release: YooKassa prod gate + deploy.

---

## Current Feature

**CI green-fix** — ruff F811 + 16 Playwright locator drifts (uncommitted, ready to push)

**Next:** Commit CI fixes → verify GitHub Actions → release gate (YooKassa ADR-004, deploy)

---

## Active Agent

Composer 2.5 (UX V2 Phase 12)

---

## Current Blockers

1. **YooKassa** — 0% (ADR-004) — release gate (parallel chat)
2. **Deploy** — merge branch → `master` (migrations 021–023 + lockdown)
3. **SMTP** — prod `.env.production` must use real SMTP
4. **Business copy** — contacts/delivery/returns for Phase 3 info pages

---

## Progress Snapshot

| Area | Status |
|------|--------|
| ECOMMERCE UX V2 Phases 0–8 | ✅ COMPLETE |
| Admin UX v2 Phases 0–12 | ✅ COMPLETE |
| Auth lockdown | ✅ implemented (deploy pending) |
| Mobile UX Wave 5 | ⏳ merge + smoke |
| YooKassa | ❌ not started |

---

## Last Updated

2026-08-12 (CI fix — ruff + E2E locators)
