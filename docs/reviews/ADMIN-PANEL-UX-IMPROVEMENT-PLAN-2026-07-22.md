# Admin Panel UX Improvement Plan

**Date:** 2026-07-22  
**Scope:** Production admin panel at `https://сухопут-кмв.рф/admin` and current local implementation.  
**Goal:** Turn the admin panel from a working set of operational pages into a scalable back-office product for catalog, stock, orders, customers, and MoySklad workflows.

---

## Executive Summary

The admin panel already has a strong foundation: separated admin auth, RBAC-aware navigation, dashboard action center, mobile card layouts, MoySklad read-only field ownership, import queue, catalog editing, inventory visibility, and order operations.

The main problem is not missing pages. The main problem is workflow scalability. Real production data already exposes this:

- `329` products in the MoySklad import queue.
- `17` catalog/import pages.
- `5476` low-stock inventory rows.
- `110` low-stock inventory pages.
- Product edit pages can exceed `4500px` height on mobile.

The next product-quality step should focus on:

1. Workflow-first information architecture.
2. A reusable admin design system.
3. Better tables, filters, and saved views.
4. Scalable bulk operations.
5. Stronger notification and error handling.
6. Mobile task-first layouts.
7. Accessibility and hydration reliability.

---

## Priority 0 — Immediate Production Fixes

### 1. Fix Sidebar Navigation Layout

**Problem:**  
On production desktop and mobile drawer, sidebar links inside each section render inline and visually overlap or crowd each other.

**Why It Matters:**  
Navigation is the primary control surface. Broken spacing reduces trust, readability, and click accuracy.

**Criticality:** High

**Fix:**  
Make each sidebar link a full-width block/flex item.

**Implementation Example:**

```tsx
<Link
  className={cn(
    "flex min-h-11 w-full items-center rounded-md px-3 py-2.5 text-sm font-medium",
    active ? "bg-muted text-foreground" : "text-foreground hover:bg-muted",
  )}
>
  {item.label}
</Link>
```

**Target File:**  
`apps/web/src/components/admin/admin-sidebar-nav.tsx`

---

### 2. Investigate React Hydration Error on Product Edit

**Problem:**  
Production product edit page emits `Minified React error #418`, likely a server/client text mismatch.

**Why It Matters:**  
Hydration mismatches can cause subtle UI instability, incorrect text, or broken interactions.

**Criticality:** High

**Fix:**  
Audit date formatting, locale formatting, conditional text, and any client/server rendered dynamic values on admin product edit.

**Implementation Example:**

```tsx
// Prefer passing already formatted server text to client components,
// or render date-dependent values only after mount.
const syncedAtLabel = product.last_synced_at
  ? formatAdminDate(product.last_synced_at)
  : "Не синхронизировано";
```

**Target Areas:**  
`admin-product-edit-form.tsx`, `moysklad-product-banner.tsx`, gallery/variant client components.

---

### 3. Deploy Current Admin Catalog Stock Visibility

**Problem:**  
Production catalog does not show the new `Остаток (МС)` column, while the current local branch includes it.

**Why It Matters:**  
Operators cannot see stock state directly from the catalog list.

**Criticality:** Medium

**Fix:**  
Deploy the current admin catalog stock visibility changes after normal validation.

**Target Areas:**  
`apps/web/src/app/admin/(panel)/catalog/page.tsx`  
`apps/web/src/components/admin/catalog/admin-product-stock.tsx`

---

## Quick Wins — 1 to 2 Weeks

### 1. Replace Text-Link Filters with Filter Chips

**Problem:**  
Catalog, orders, and inventory filters are plain links separated by dots or pipes.

**Why It Matters:**  
Active state is weak, filters are hard to scan, and there is no obvious reset.

**Criticality:** Medium

**Fix:**  
Create a reusable `AdminFilterChips` component with active state, counts, and reset.

**Implementation Example:**

```tsx
<AdminFilterChips
  items={[
    { label: "Все", href: "/admin/catalog?all=1", active: true },
    { label: "Требует оформления", href: "/admin/catalog?needs_styling=1&all=1" },
    { label: "Фото по цветам", href: "/admin/catalog?needs_color_photos=1&all=1" },
  ]}
  resetHref="/admin/catalog?all=1"
/>
```

---

### 2. Create Shared Admin Search Component

**Problem:**  
Search forms are duplicated across catalog, orders, inventory, and customers.

**Why It Matters:**  
Duplicated UI creates inconsistent behavior and slows future improvements.

**Criticality:** Medium

**Fix:**  
Introduce `AdminSearchBar` with explicit label, placeholder, hidden params, and optional clear button.

**Implementation Example:**

```tsx
<AdminSearchBar
  action="/admin/inventory"
  label="Поиск по складу"
  placeholder="SKU или название товара"
  defaultQuery={query}
  hidden={{ low_stock: lowStockOnly ? "true" : undefined }}
/>
```

---

### 3. Add Sticky Save Bar on Product Edit

**Problem:**  
On long product edit pages, save actions are buried inside the first form section.

**Why It Matters:**  
Operators scroll thousands of pixels and lose the action context.

**Criticality:** Medium

**Fix:**  
Add sticky bottom action bar on mobile and sticky top/right action area on desktop.

**Implementation Example:**

```tsx
<div className="sticky bottom-0 z-20 border-t bg-background p-3 md:top-4 md:bottom-auto">
  <Button type="submit" form="admin-product-form">Сохранить</Button>
  <Button type="submit" form="admin-product-form" name="intent" value="close" variant="outline">
    Сохранить и закрыть
  </Button>
</div>
```

---

### 4. Replace `window.confirm` with Confirm Dialog

**Problem:**  
Category deletion uses native `window.confirm`.

**Why It Matters:**  
Native dialogs are not branded, not descriptive enough, and cannot show operational impact clearly.

**Criticality:** Medium

**Fix:**  
Create `AdminConfirmDialog` with title, description, consequence list, and destructive action.

**Implementation Example:**

```tsx
<AdminConfirmDialog
  title="Удалить категорию?"
  description="Товары останутся без категории и будут скрыты с витрины."
  confirmLabel="Удалить категорию"
  destructive
  onConfirm={deleteCategory}
/>
```

---

### 5. Upgrade Toasts to Severity-Based Notifications

**Problem:**  
Current toast pattern mostly supports generic success-style messages.

**Why It Matters:**  
Operators need to distinguish success, warning, retryable errors, and critical integration failures.

**Criticality:** High

**Fix:**  
Add notification variants: `success`, `warning`, `error`, `info`, with optional retry/action.

**Implementation Example:**

```tsx
showToast({
  tone: "error",
  message: "Не удалось обновить остатки.",
  action: { label: "Повторить", onClick: retryStockSync },
});
```

---

## Medium-Term Improvements — 3 to 6 Weeks

### 1. Build a Reusable `AdminDataTable`

**Problem:**  
Tables are implemented separately and lack sorting, sticky headers, density, column visibility, and saved preferences.

**Why It Matters:**  
Admin productivity depends on fast scanning and prioritization.

**Criticality:** High

**Fix:**  
Create one table foundation used by catalog, inventory, orders, customers, and import queue.

**Capabilities:**

- Sortable columns.
- Sticky header.
- Column visibility.
- Compact/comfortable density.
- Row actions.
- Bulk selection.
- Empty/error/loading states.
- Mobile card fallback.

**Implementation Example:**

```tsx
<AdminDataTable
  columns={inventoryColumns}
  rows={items}
  getRowId={(item) => item.variant_id}
  stickyHeader
  density="compact"
  mobile="cards"
/>
```

---

### 2. Create a Dedicated Merchandising Workflow Page

**Problem:**  
The real workflow is split between import queue, catalog list, product edit, gallery, and inventory.

**Why It Matters:**  
Operators need a task queue, not a set of disconnected database views.

**Criticality:** High

**Fix:**  
Add `/admin/catalog/workflow` or improve import queue into a full merchandising board.

**Suggested Views:**

- New from MoySklad.
- No category.
- No photo.
- Missing color photos.
- Ready to publish.
- Published.
- Hidden.

**Implementation Example:**

```tsx
<AdminWorkflowBoard
  lanes={[
    { id: "no_category", title: "Без категории", count: 329 },
    { id: "no_photo", title: "Без фото", count: 329 },
    { id: "ready", title: "Готовы к публикации", count: 0 },
  ]}
/>
```

---

### 3. Group Inventory by Product

**Problem:**  
Inventory low-stock view shows many variant rows for the same product.

**Why It Matters:**  
With `5476` low-stock rows, operators cannot prioritize at product level.

**Criticality:** High

**Fix:**  
Add product-grouped inventory view with expandable variant rows.

**Implementation Example:**

```tsx
<InventoryProductGroup
  productName="Спальный мешок Белый Тигр"
  totalAvailable={0}
  variants={variants}
  defaultOpen={false}
/>
```

**Backend Support:**  
Add grouped inventory endpoint or extend current endpoint with `group_by=product`.

---

### 4. Add Saved Views

**Problem:**  
Users repeatedly use the same filters, but the UI does not remember or promote them.

**Why It Matters:**  
Saved views reduce task setup time and match modern SaaS expectations.

**Criticality:** Medium

**Fix:**  
Add default system views first; user-custom views later.

**Initial Views:**

- Catalog: `Все`, `Черновики`, `Требует оформления`, `Фото по цветам`.
- Inventory: `Низкий остаток`, `Нет в наличии`, `Есть резерв`.
- Orders: `Ожидает экспорта`, `Подтверждённые`, `Отправленные`.

---

### 5. Improve Empty, Error, and Loading States

**Problem:**  
Some pages use plain text errors and generic loading skeletons.

**Why It Matters:**  
Admin users need recovery actions, not only messages.

**Criticality:** Medium

**Fix:**  
Create reusable states:

- `AdminEmptyState`
- `AdminErrorState`
- `AdminLoadingSection`
- `AdminPermissionState`

**Implementation Example:**

```tsx
<AdminErrorState
  title="Не удалось загрузить остатки"
  description="Проверьте соединение с API или повторите запрос."
  action={{ label: "Обновить", href: "/admin/inventory" }}
/>
```

---

## Large Architectural Improvements — 6 to 12 Weeks

### 1. Establish an Admin Design System

**Problem:**  
Admin UI uses shadcn primitives directly plus page-specific Tailwind classes.

**Why It Matters:**  
As admin grows, inconsistent form/table/card patterns will slow development and degrade UX.

**Criticality:** High

**Fix:**  
Create admin-specific primitives:

- `AdminPageHeader`
- `AdminToolbar`
- `AdminDataTable`
- `AdminFormSection`
- `AdminField`
- `AdminStatusBadge`
- `AdminConfirmDialog`
- `AdminNotificationCenter`
- `AdminWorkflowChecklist`

---

### 2. Add Backend Overview Endpoints

**Problem:**  
Dashboard and admin pages make several independent calls and compute counts through list endpoints.

**Why It Matters:**  
With production data, list endpoints should not be used as overview counters.

**Criticality:** Medium

**Fix:**  
Add purpose-built endpoints:

- `GET /api/v1/admin/catalog/overview`
- `GET /api/v1/admin/inventory/overview`
- `GET /api/v1/admin/moysklad/workflow-summary`

**Implementation Example:**

```json
{
  "needs_category": 329,
  "needs_photo": 329,
  "needs_color_photos": 42,
  "ready_to_publish": 12,
  "low_stock_products": 870,
  "low_stock_variants": 5476
}
```

---

### 3. Move Bulk Operations to Background Jobs

**Problem:**  
Bulk operations patch products sequentially from server actions.

**Why It Matters:**  
Large imports need progress, retries, cancellation, and result reporting.

**Criticality:** High

**Fix:**  
Introduce bulk job endpoints and UI progress tracking.

**Implementation Example:**

```tsx
<BulkJobProgress
  jobId={job.id}
  title="Публикация товаров"
  counters={{ done: 42, failed: 3, skipped: 18 }}
/>
```

---

### 4. Add Global Command Palette

**Problem:**  
Power users need fast navigation and action execution.

**Why It Matters:**  
Modern SaaS products reduce task time with command menus.

**Criticality:** Medium

**Fix:**  
Add `Cmd/Ctrl+K` command palette.

**Commands:**

- Search product by SKU/name.
- Open order by number.
- Open customer by email.
- Go to import queue.
- Run stock sync.
- Open low-stock view.

---

## Best-in-Class SaaS Ideas

### Linear-Inspired

- Command palette for every admin action.
- Keyboard shortcuts for table navigation.
- Saved views and issue-like workflow queues.

### Stripe Dashboard-Inspired

- Event timeline on product/order/integration pages.
- Clear status badges and retry actions.
- Audit trail for every admin mutation.

### GitHub-Inspired

- Saved filters as tabs.
- Bulk selection and row-level actions.
- URL-first filter state for shareable admin views.

### Vercel-Inspired

- Integration status cards.
- Deployment/config health checks.
- Clear operational alerts.

### Supabase-Inspired

- Data-heavy admin tables with strong filtering.
- Inline relationship navigation.
- Compact detail panels.

### Notion-Inspired

- Flexible views: table, board, grouped list.
- Lightweight inline editing where safe.
- Per-view sorting and grouping.

---

## Recommended Execution Order

1. Fix sidebar nav layout.
2. Investigate hydration error on product edit.
3. Deploy current catalog stock visibility.
4. Add filter chips and shared search.
5. Add sticky save bar and confirm dialog.
6. Upgrade toast/notification system.
7. Build reusable `AdminDataTable`.
8. Group inventory by product.
9. Build merchandising workflow page.
10. Add saved views.
11. Move bulk operations to background jobs.
12. Add command palette and event timelines.

---

## Success Metrics

Track these before and after improvements:

- Time to find a product by SKU.
- Time to classify/import 20 MoySklad products.
- Time to publish a ready product.
- Time to identify product-level low-stock priorities.
- Number of clicks from dashboard alert to resolved state.
- Error recovery success rate after failed sync/upload/publish.
- Mobile completion rate for product photo/category edits.
- Admin console error count in production.

---

## Permanent Reference

This plan is stored at:

`docs/reviews/ADMIN-PANEL-UX-IMPROVEMENT-PLAN-2026-07-22.md`
