# Current Context

> 30-second overview for fast agent orientation.

---

## Current Module

**CORRECTIVE UX** — code complete locally; **not on production**.

---

## Current Feature

**Prod Visual QA (2026-08-12):** FAIL — deploy lag.

Evidence on `https://сухопут-кмв.рф`:
- Header still TrustBar + no `primaryNav` (Каталог/Новинки/Распродажа)
- PDP sneakers: wrong camo image; variant pills = full ERP names; default 39 OOS
- Corrective Phases 1–4 changes exist only as **uncommitted local** work on `master`

**Next:** Commit Corrective UX → push/deploy → re-run Visual QA. Ops: fix sneakers media after deploy (or in admin now).

---

## Active Agent

Composer (prod Visual QA)

---

## Current Blockers

1. **Deploy lag** — Corrective UX not shipped
2. **Ops:** wrong sneakers `/media/` image
3. **YooKassa** — ADR-004

---

## Progress Snapshot

| Area | Status |
|------|--------|
| Corrective UX code (0–4) | ✅ local |
| Prod deploy / Visual QA | ❌ |
| YooKassa | ❌ |

---

## Last Updated

2026-08-12 (prod Visual QA — not deployed)
