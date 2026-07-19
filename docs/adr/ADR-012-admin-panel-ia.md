# ADR-012: Admin Panel Information Architecture & Merchandising Workflow

**Status:** Accepted  
**Date:** 2026-07-19

## Context

Admin Wave 1 improved login redirect, import queue UX, and dashboard styling cards.
Operators still face friction:

- Flat sidebar mixes merchandising (catalog, categories) with ERP sync and operations.
- Dashboard metrics lack actionable alerts for sync failures and pending order exports.
- Inventory UI shows adjust forms for MoySklad-synced SKUs even though API rejects edits.
- Product edit always redirects to catalog list after save, breaking multi-field merchandising.

MoySklad (ADR-010) owns stock for synced products; admin owns display layer only.

## Decision

### 1. Grouped sidebar navigation

Organize admin nav into three sections:

| Section | Items |
|---------|-------|
| **Сводка** | Dashboard (top-level) |
| **Витрина** | Товары, Категории |
| **МойСклад** | Интеграция, Очередь импорта |
| **Операции** | Склад, Заказы, Клиенты |

Categories get a dedicated sidebar link (`/admin/catalog/categories`) instead of
being buried inside catalog-only flows.

### 2. Dashboard action center

Below metric cards, show an «Требует внимания» panel when any of:

- `pending_imports > 0` → link to import queue
- `needs_styling_count > 0` → link to catalog filter
- `errors_last_24h > 0` or `last_error` → link to MoySklad integration
- `pending_order_exports > 0` → link to orders list

Read-only; uses existing MoySklad status API — no new backend endpoint.

### 3. Inventory read-only for MS-synced SKUs

- Extend `GET /admin/inventory` items with `sync_source` (`manual` | `moysklad`).
- Frontend hides adjust form when `sync_source=moysklad`; show «Из МойСклад» badge.
- Hide adjust UI when admin lacks `inventory:write` permission.

### 4. Product save without redirect

- Primary button «Сохранить» stays on edit page; shows toast on success.
- Secondary «Сохранить и закрыть» redirects to catalog list (previous behavior).
- Server action reads `intent` form field: `stay` (default) vs `close`.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| New dashboard alerts API | MoySklad status already exposes counts; avoid duplication |
| Disable inventory rows server-side for MS | Operators still need read-only stock visibility |
| Auto-save on blur | Unexpected writes; harder to validate SEO/display fields |

## Consequences

**Positive:** Merchandising workflow matches MS import → queue → edit → publish;
operators see actionable alerts; inventory UI matches API guardrails.

**Negative:** Nav component gains section grouping; inventory list query joins
`products.sync_source` (negligible cost).

## Related

- ADR-007, ADR-010
- `apps/web/src/lib/admin/navigation.ts`
- `apps/api/app/features/inventory/infrastructure/persistence/admin_inventory_repository.py`
