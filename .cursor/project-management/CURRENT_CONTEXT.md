# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

Auth email — verification code + password reset UX

---

## Current Feature

**Email verification code** — код + ссылка в письме, форма на `/register/check-email` ✅

---

## Active Agent

Composer (auth email verification code)

---

## Current Milestone

**Phase 24 — Internet Store Design** (~92% functional, ~65% business release-ready)

---

## Verification URL

Browser checks (Playwright MCP, smoke tests): **`https://сухопут-кмв.рф`** — not localhost. See `.cursor/VERIFICATION.md`.

---

## Current Blockers

1. **Deploy pending** — auth email code changes not on prod yet; SMTP env on VPS
2. **YooKassa** — payment not implemented (main release blocker)
3. **329 товаров без категорий** — content ops
4. **DNS SPF/DKIM** — recommended before first live send

---

## Progress Snapshot

| Area | Status |
|------|--------|
| Email verification (code + link) | ✅ implemented locally |
| Password reset (forgot + reset) | ✅ already complete |
| Auth email code (SMTP + HTML templates) | ✅ merged locally; deploy pending |
| reg.ru SMTP runbook | ✅ `docs/ops/PRODUCTION-EMAIL-SETUP.md` |
| Prod `.env.production` SMTP vars | ⏳ operator action on VPS |
| Wave 1 YooKassa | ❌ pending |
| Wave 1 Categories (329 products) | ❌ pending (content task) |

---

## Agent Entry Point

**Read first:** `docs/reviews/PROJECT-ACTION-PLAN-2026-07-29.md`  
This document contains concrete Wave 0–4 tasks with file paths, implementation notes, exit criteria, and agent rules.

---

## Last Updated

2026-07-30 (email verification code + link flow)
