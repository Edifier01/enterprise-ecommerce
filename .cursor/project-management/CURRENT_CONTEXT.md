# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

Project audit + agent action plan

---

## Current Feature

**Wave 0 ops execution** — admin Phase B/C pushed (`a51743b`); CI → auto-deploy in progress. Next: prod smoke + MS stock + media env.

---

## Active Agent

Composer (Wave 0 deploy)

---

## Current Milestone

**Phase 24 — Internet Store Design** (~92% functional, ~60% business release-ready)

---

## Verification URL

Browser checks (Playwright MCP, smoke tests): **`https://сухопут-кмв.рф`** — not localhost. See `.cursor/VERIFICATION.md`.

---

## Current Blockers

1. **YooKassa** — payment not implemented (main release blocker)
2. **329 товаров без категорий** — витрина пуста
3. **Deploy in flight** — `a51743b` pushed to master; CI → auto-deploy pending confirmation on prod
4. **MS stock = 0 на проде** — MOYSKLAD_STORE_ID не верифицирован
5. **SMTP** — email не доставляется на проде

---

## Progress Snapshot

| Area | Status |
|------|--------|
| Full audit + action document | ✅ `docs/reviews/PROJECT-ACTION-PLAN-2026-07-29.md` |
| Storefront PDP/PLP photo + specs | ⏳ pushed (a81dc86); prod smoke pending |
| Admin redesign A/B/C | ⏳ pushed (a51743b); prod smoke pending |
| stich.su UX parity P0/P1 | ⏳ on master; prod smoke pending |
| Wave 0 ops (deploy, stock, media) | ⏳ 0.1 deploy in flight; 0.2–0.5 pending |
| Wave 1 YooKassa | ❌ pending |
| Wave 1 SMTP | ❌ pending |
| Wave 1 Categories (329 products) | ❌ pending (content task) |

---

## Agent Entry Point

**Read first:** `docs/reviews/PROJECT-ACTION-PLAN-2026-07-29.md`  
This document contains concrete Wave 0–4 tasks with file paths, implementation notes, exit criteria, and agent rules.

---

## Last Updated

2026-07-29 (Wave 0: admin Phase B/C commit + push)
