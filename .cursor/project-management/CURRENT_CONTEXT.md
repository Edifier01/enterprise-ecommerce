# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

Parallel UX track: Mobile Wave 4–6  
YooKassa prod gate remains release priority (other chat OK).

**Mobile:** Wave 5 committed with auth (`daf16fe`) — **merge to master pending**  
**YooKassa plan:** `docs/reviews/YOOKASSA-PROD-GATE-ACTION-PLAN-2026-08-08.md`

---

## Current Feature

**CI green fix** for Auth/Wave A branch — OpenAPI + E2E committed/pushed.  
**Branch:** `feat/wave-a-l3-guest-email-adr016`.  
**Next:** confirm CI green → merge → deploy; prod SMTP required.

---

## Active Agent

Composer 2.5 (CI fix /start-feature)

---

## Current Blockers

1. **YooKassa** — 0% (ADR-004) — release gate (parallel chat)
2. **Deploy** — merge to `master` (migrations 021–023); **prod register 500 = SMTP fail after user create on master**
3. **SMTP** — prod `.env.production` must use real SMTP; fix in `daf16fe` lets register succeed even if send fails
4. **Await CI** — OpenAPI + auth/checkout E2E fixes pushed; confirm green before merge

---

## Progress Snapshot

| Area | Status |
|------|--------|
| ADR-015 / Wave A | ✅ done (deploy 021–022 pending) |
| Mobile UX Wave 4 audit | ✅ |
| Mobile UX Wave 5 P0/P1 code | ✅ verifier ⚠️ NOTES |
| Mobile UX Wave 5 prod | ⏳ merge to master + smoke |
| Auth Waves A–C commit | ✅ `daf16fe` — deploy pending |
| Mobile UX Wave 6 P2 | ⏳ backlog |
| YooKassa | ❌ not started |
| Auth flows review | ✅ verifier ⚠️ NOTES |

**AI routing:** Opus 5 (`claude-opus-5-thinking-high`) on reserved agents — architect, checkout, security (2026-08-10).

---

## Last Updated

2026-08-10 (CI OpenAPI + auth/checkout E2E fixes — commit/push)
