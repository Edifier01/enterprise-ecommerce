# Handoff

## Latest Session

Composer 2.5 — CI fix: ruff F811 + E2E locator drift (2026-08-12)

## Completed Work (CI fix)

**Ruff**
- `router.py` — removed duplicate `Response` import (`fastapi.responses`); kept `from fastapi import Response`

**E2E (16 failures → locator/UI drift after Phase 12)**
- Strict-mode violations: `exact: true` or scoped locators (sidebar «Импорт», SKU text, «Настройки витрины», customers «Все»)
- Bulk toolbar labels: «Скрыть»/«Показать» (not «…выбранные»)
- Import queue: assert `heading` «Импорт товаров»
- Status quick-edit: scope to desktop `table` (mobile card copy is `md:hidden`)
- Unsaved guard: `page.once('dialog')` + `click({ noWaitAfter: true })` on cancel link
- Mobile storefront: open search via «Открыть поиск» toggle before asserting input

**Validation:** `ruff check` clean locally; Playwright not run locally (Postgres unavailable)

## Previous Session

Composer 2.5 — Admin UX v2 Phase 12 (2026-08-11)

## Completed Work

### Admin UX v2 Phase 12 — Polish, a11y, E2E expansion (GAP-17)

**A11y polish**
- `admin-data-table.tsx` — column picker `aria-label`, `aria-controls`, Escape/outside dismiss, `aria-sort` on sortable headers, focus rings, `min-h-11` column button
- `admin-next-item-navigation.tsx` — `min-h-11`, descriptive `aria-label`, focus ring
- `admin-product-section-nav.tsx` — focus-visible rings, `prefers-reduced-motion` scroll
- `admin-product-edit-form.tsx` — focus ring on readiness `<summary>`

**Command palette (Phase 12 polish)**
- `admin-commands.ts` — quick views: Оптовые клиенты, Розничные клиенты

**E2E expansion**
- `admin-wave16-smoke.spec.ts` — column picker, next-product queue, unsaved guard, workflow + wholesale customers via palette

**Validation:** `npx tsc --noEmit` clean

## Admin UX v2 status

Phases 0–12 **COMPLETE** per `docs/ux/admin-ia-v2.md`. Deferred: GAP-18 event timeline, TipTap, persisted saved views DB.

## Files Changed (key)

- `apps/web/src/components/admin/admin-data-table.tsx`
- `apps/web/src/components/admin/admin-next-item-navigation.tsx`
- `apps/web/src/components/admin/catalog/admin-product-section-nav.tsx`
- `apps/web/src/components/admin/catalog/admin-product-edit-form.tsx`
- `apps/web/src/lib/admin/admin-commands.ts`
- `apps/web/e2e/admin-wave16-smoke.spec.ts`

## Next Recommended Action

1. **Commit** Phases 3–12 when user approves
2. **Deploy** + prod smoke on `https://сухопут-кмв.рф/admin`
3. **YooKassa** prod gate (ADR-004) — parallel track

## Blockers (unchanged)

- YooKassa prod gate (ADR-004)
- Mobile Wave 5 deploy pending
