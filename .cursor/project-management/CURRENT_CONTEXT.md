# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

Storefront — product photo display fix

---

## Current Feature

**PLP/PDP image URL fix** — cherry-picked to `master`; CI deploy pending

---

## Active Agent

Composer (storefront photo fix + deploy)

---

## Current Blockers

1. **Deploy pending** — web container rebuild required for photo fix on prod
2. **YooKassa** — payment not implemented (main release blocker)
3. **329 товаров без категорий** — content ops

---

## Progress Snapshot

| Area | Status |
|------|--------|
| Storefront photo SSR URL fix | ✅ on master; deploy pending |
| Prod verification (2026-07-30) | ✅ bug confirmed — `http://api:8000/media/...` in SSR HTML |

---

## Last Updated

2026-07-30 (photo fix cherry-picked to master)
