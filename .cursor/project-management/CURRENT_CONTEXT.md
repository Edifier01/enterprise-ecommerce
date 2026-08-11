# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

**ECOMMERCE UX V2** (Phase 0 ecommerce-wide audit complete).  
Parallel release work still open: YooKassa prod gate + auth/mobile deploy branch.

---

## Current Feature

**ECOMMERCE UX V2 — Phase 0 COMPLETE**  
Deliverable: `docs/ux/ecommerce-ux-audit.md`  
Verifier: **APPROVED WITH NOTES** (2026-08-11)

**Next:** Phase 1 — `docs/ux/ecommerce-ux-v2-architecture.md` only after user approval.

Top P1 gaps from audit: YooKassa/Stripe checkout mismatch, placeholder contacts/info IA, cart images/SKU/currency, PDP fake fallback content, search suggestions, draft preview.

---

## Active Agent

GPT-5.5 (ECOMMERCE UX V2 Phase 0)

---

## Current Blockers

1. **YooKassa** — 0% (ADR-004) — release gate (parallel chat)
2. **Deploy** — merge branch → `master` (migrations 021–023 + lockdown)
3. **SMTP** — prod `.env.production` must use real SMTP
4. ECOMMERCE UX V2 Phase 1 not started until user approves

---

## Progress Snapshot

| Area | Status |
|------|--------|
| ECOMMERCE UX V2 Phase 0 audit | ✅ APPROVED WITH NOTES |
| Admin UX v2 Phase 0 audit | ✅ APPROVED WITH NOTES |
| Auth lockdown | ✅ implemented (deploy pending) |
| Mobile UX Wave 5 | ⏳ merge + smoke |
| YooKassa | ❌ not started |

**AI routing:** Opus 5 on reserved agents — architect, checkout, security.

---

## Last Updated

2026-08-11 (ECOMMERCE UX V2 Phase 0 audit)
