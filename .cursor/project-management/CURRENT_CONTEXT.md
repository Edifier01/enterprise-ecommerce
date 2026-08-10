# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

Temporary storefront auth lockdown (registration closed).  
YooKassa prod gate remains release priority (other chat OK).

**Mobile:** Wave 5 + auth CI fixes on `feat/wave-a-l3-guest-email-adr016`  
**YooKassa plan:** `docs/reviews/YOOKASSA-PROD-GATE-ACTION-PLAN-2026-08-08.md`

---

## Current Feature

**Temporary auth lockdown** — hide login/register CTAs + block API register.  
Flags: `STOREFRONT_AUTH_UI_ENABLED` / `AUTH_REGISTRATION_ENABLED` (prod default false).  
`/login` by URL still works for existing users.

---

## Active Agent

Composer 2.5 (/start-feature auth lockdown)

---

## Current Blockers

1. **YooKassa** — 0% (ADR-004) — release gate (parallel chat)
2. **Deploy** — merge branch → `master` (migrations 021–023 + lockdown)
3. **SMTP** — prod `.env.production` must use real SMTP
4. **Reopen auth later** — set both flags `true` (+ redeploy)

---

## Progress Snapshot

| Area | Status |
|------|--------|
| Auth lockdown | ✅ implemented (commit pending) |
| Auth Waves A–C | ✅ on feature branch |
| Mobile UX Wave 5 | ⏳ merge + smoke |
| YooKassa | ❌ not started |

**AI routing:** Opus 5 on reserved agents — architect, checkout, security.

---

## Last Updated

2026-08-10 (temporary storefront auth lockdown)
