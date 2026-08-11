# Admin UX Audit — Phase 0

**Date:** 2026-08-11  
**Status:** VERIFIER APPROVED WITH NOTES (2026-08-11)  
**Scope:** Existing `/admin` implementation vs Admin UX v2 TZ (Operational Control Center + Merchandising CMS)  
**Mode:** Read-only inventory — **no application code changed**

**Finding field aliases (TZ §64):** `existing_component` = текущий компонент; `proposed_solution` = предлагаемое решение; `affected_files` = затронутые файлы; `phase` = recommended implementation phase.

**Sources:**
- Code: `apps/web/src/app/admin/**`, `apps/web/src/components/admin/**`, `apps/api/.../admin*`
- ADRs: ADR-007, ADR-010, ADR-011, ADR-012, ADR-013, ADR-014
- Prior plan: `docs/reviews/ADMIN-PANEL-UX-IMPROVEMENT-PLAN-2026-07-22.md`
- PM: Admin UX Waves 1–14 + Visual Redesign Phases A/B/C (COMPLETED in `TASKS.md`)
- E2E: `apps/web/e2e/admin*`, `mobile-admin.spec.ts`
- Prod smoke: blocked by auth at `https://сухопут-кмв.рф/admin` (login only); qualitative notes from `prod-admin-*.png`

---

## Executive summary

Админка **не с нуля**: Waves 8–14 и Phase A/B/C уже дали shell, Action Center, `AdminDataTable`, saved views, command palette, bulk jobs, MS read-only guards, gallery color coverage, `from`/`return_to`.

Главный остаточный разрыв — **операторский merchandising loop на карточке товара**:

1. Readiness / publish blockers не показаны на edit (только на import queue).
2. Нет «Следующий товар» в контексте фильтра/очереди.
3. Нет защиты от ухода с несохранёнными изменениями.
4. Workflow board = wayfinding, не action-first очередь.
5. MS-поля read-only через muted divs, без единого паттерна «🔒 Управляется МойСклад».

**Backend blocking gaps for TZ:** нет. Почти всё закрывается существующими API + FE.

**Следующий шаг после verifier APPROVED:** Phase 1 — `docs/ux/admin-ia-v2.md` (docs only).

---

## 1. Inventory

### 1.1 Routes (`apps/web/src/app/admin/**`)

| Route | Purpose |
|-------|---------|
| `/admin/login` | Admin JWT login |
| `/admin` | Dashboard KPI + «Требует внимания» |
| `/admin/catalog` | Category landing **or** product list (`?all=1`, filters) |
| `/admin/catalog/workflow` | Merchandising lane board (links) |
| `/admin/catalog/categories` | Category CRUD |
| `/admin/catalog/new` | Redirect → MoySklad (MS-only create) |
| `/admin/catalog/[id]/edit` | Product merchandising edit |
| `/admin/integrations/moysklad` | Sync status, pull, logs |
| `/admin/integrations/moysklad/import` | Import queue (action-first) |
| `/admin/inventory` | Stock list (variant/product group) |
| `/admin/orders`, `/admin/orders/[orderNumber]` | Orders list + detail |
| `/admin/customers` | Customers list |

Shell: `(panel)/layout.tsx` — sidebar, mobile drawer, command palette.  
IA: `apps/web/src/lib/admin/navigation.ts` (ADR-012).

### 1.2 Shared primitives — wish-list vs EXISTS

| Primitive | Status | Path / notes |
|-----------|--------|--------------|
| `AdminPageHeader` | EXISTS | `admin-page-header.tsx` |
| `AdminFormSection` | EXISTS | `admin-form-section.tsx` |
| `AdminSection` | MISSING | Use/extend `AdminFormSection` — do not invent parallel |
| `AdminReadinessPanel` | MISSING | Logic exists in `merchandising-readiness.ts`; UI only on import queue |
| `AdminStatusBadge` | MISSING | Ad-hoc Badge / plain text |
| `AdminFilterBar` | MISSING | Compose `AdminSavedViews` + `AdminFilterChips` + search |
| `AdminSavedViews` | EXISTS | System URL presets |
| `AdminColumnPicker` | PARTIAL | Embedded in `AdminDataTable` |
| `AdminBulkToolbar` | PARTIAL | `AdminCatalogBulkToolbar` only; import has custom UI |
| `AdminEmptyState` | EXISTS | |
| `AdminErrorState` | EXISTS | + Fetch / Forbidden variants |
| `AdminNextItemNavigation` | MISSING | Critical gap |
| `AdminDataTable` | EXISTS | Sort, columns, selection, mobile cards |
| Command palette | EXISTS | `admin-command-palette.tsx` + `admin-commands.ts` |

**Also EXISTS (reuse):** `AdminSearchBar`, `AdminFilterChips`, `AdminConfirmDialog`, `AdminPagination`, `AdminKpiCard`, `AdminBulkJobProgress`, `AdminMobileCard*`, `MoySkladBadge`, `AdminWorkflowBoard`.

### 1.3 API reuse matrix (no new API required for Phase 0 gaps)

| TZ need | Existing API |
|---------|--------------|
| Dashboard KPIs | `GET /admin/dashboard/summary` |
| Attention items | Compose: `catalog/overview` + `moysklad/status` + `inventory/overview` (ADR-012) |
| Catalog filters / saved views | `GET /admin/catalog/products` + query params; counts from `catalog/overview` |
| Bulk assign / publish | `POST /admin/jobs/bulk` (`assign_category`, `publish_products`) |
| Bulk hide / show | Sequential `PATCH` via server actions (works; jobs optional later) |
| Publish blockers | Enforced on `PATCH` → 422; FE mirror in `merchandising-readiness.ts` |
| MS sync | `GET .../moysklad/status`, pull/stock/resync, logs, order export |
| Stock on catalog | Embedded in product list/detail |
| Export-pending orders | `GET /admin/orders?export_pending=true` |
| Next-in-queue | **No dedicated API** — FE can use filtered list + `?from=` |

Full admin router: `apps/api/app/features/admin/presentation/router.py`.

### 1.4 Merchandising readiness (backend truth)

Canonical: `apps/api/app/features/catalog/domain/merchandising_readiness.py`

| Code | Rule |
|------|------|
| `missing_category` | No `category_id` |
| `missing_photo` | No site-owned photo (`erp_image_url` insufficient) |
| `missing_color_photos` | Multi-color product missing gallery tags |

Enforced: product PATCH publish transition; bulk publish jobs; overview SQL counts.  
FE mirror: `apps/web/src/lib/admin/merchandising-readiness.ts` (used in import queue + bulk show pre-check; **not on edit page**).

### 1.5 MS sync protection

`apps/api/app/features/integrations/moysklad/domain/sync_guard.py` — product prices/currency; variant sku/prices/attributes; variant create; inventory adjust → 422.

---

## 2. Doc vs code drift

| Topic | Doc | Code | Drift |
|-------|-----|------|-------|
| 2026-07-22 P0 + quick wins + medium | Plan listed as open | Waves 8–14 DONE | Plan is **stale** — treat as historical |
| ADR-012 sidebar | Витрина: Товары, Категории | + **Оформление** (workflow) | Extended beyond ADR text |
| ADR-012 alerts API | No new endpoint | Composed overviews | ✅ |
| UX plan `workflow-summary` API | Proposed | Not built; superseded by overview APIs | Stale proposal — **do not build** unless audit revisits |
| ADR-010 needs_styling | «draft + no image_url» | Also requires no gallery rows | Slightly stricter |
| Bulk jobs | Plan: all bulk → jobs | Assign/publish → jobs; hide/show sequential | Partial |
| TipTap descriptions | Mentioned in TASKS | Deferred | Keep deferred |

---

## 3. Critical confirmations

| Question | Verdict |
|----------|---------|
| Readiness panel on edit? | **Missing** — checklist only in `moysklad-import-panel.tsx` |
| Next-product navigation? | **Missing** |
| Unsaved changes guard? | **Missing** — no `beforeunload` / dirty tracker |
| MS fields: disabled inputs? | **Partial OK** — muted `readOnlyClass` divs (E2E asserts no price/SKU inputs); lock-label pattern missing |
| Workflow action-first? | **Board = links only**; action-first = import queue + catalog list |

---

## 4. Findings (TZ schema)

Severity: **P0** = blocks daily operator work / data loss / MS ownership confusion. **P1** = high friction on primary merchandising loop. **P2** = consistency / polish / secondary screens.

### GAP-01 — Readiness panel absent on product edit

| Field | Value |
|-------|-------|
| **screen** | `/admin/catalog/[id]/edit` |
| **existing_component** | `AdminProductEditForm`; logic `merchandising-readiness.ts`; UI only `MerchandisingChecklist` on import |
| **current_ux** | Operator edits without checklist of category / photo / color / publish readiness |
| **problem** | Blockers discovered late (failed publish / trial-and-error); TZ §18–19 unmet |
| **severity** | P1 |
| **proposed_solution** | Create `AdminReadinessPanel` from existing helpers; mount on edit; anchor links to sections |
| **affected_files** | `admin-product-edit-form.tsx`, new `admin-readiness-panel.tsx`, `merchandising-readiness.ts` |
| **backend_change** | no |
| **risk** | Low |
| **priority** | 1 |
| **phase** | 2 → 7 |

### GAP-02 — Publish blockers not proactive on edit

| Field | Value |
|-------|-------|
| **screen** | `/admin/catalog/[id]/edit` |
| **existing_component** | Status select; backend 422 on MS publish; FE `getPublishBlockers` |
| **current_ux** | Status can be set to active without inline blocker list |
| **problem** | TZ §19 — must show actionable blockers, not only API error |
| **severity** | P1 |
| **proposed_solution** | Pair with GAP-01; warn/disable publish path; map 422 RU messages to checklist |
| **affected_files** | `admin-product-edit-form.tsx`, `admin-catalog.ts` actions |
| **backend_change** | no (optional later: `publish_blockers` on GET for drift safety) |
| **risk** | Low |
| **priority** | 2 |
| **phase** | 7 |

### GAP-03 — No next-product navigation

| Field | Value |
|-------|-------|
| **screen** | `/admin/catalog/[id]/edit?from=...` |
| **existing_component** | `catalog-list-url.ts` (`from` / `return_to`) |
| **current_ux** | After save, return to list and re-find next row |
| **problem** | TZ §33 — breaks queue processing for 100–300+ items |
| **severity** | P1 |
| **proposed_solution** | `AdminNextItemNavigation`: resolve filter from `from`, fetch next ID via existing `GET .../products` |
| **affected_files** | edit `page.tsx`, new `admin-next-item-navigation.tsx`, `catalog-list-url.ts` |
| **backend_change** | no (prefer FE); optional cursor endpoint only if pagination proves insufficient |
| **risk** | Medium (stable sort across pages) |
| **priority** | 3 |
| **phase** | 2 → 7 |

### GAP-04 — No unsaved-changes guard

| Field | Value |
|-------|-------|
| **screen** | `/admin/catalog/[id]/edit` |
| **existing_component** | `AdminProductEditForm` (uncontrolled + server actions); Cancel = plain Link |
| **current_ux** | Navigate away loses form edits silently |
| **problem** | TZ §32; data loss on long sessions |
| **severity** | P1 |
| **proposed_solution** | Dirty tracking + `beforeunload` + confirm on Cancel / breadcrumb / next |
| **affected_files** | `admin-product-edit-form.tsx`, new hook |
| **backend_change** | no |
| **risk** | Medium (must not fight Save / Save & close) |
| **priority** | 4 |
| **phase** | 7 |

### GAP-05 — Workflow board is navigation-only

| Field | Value |
|-------|-------|
| **screen** | `/admin/catalog/workflow` |
| **existing_component** | `AdminWorkflowBoard` |
| **current_ux** | 8 lanes with counts → deep links; duplicate import/uncategorized lanes |
| **problem** | TZ §9–11 want compact action-first queue with problem + CTA |
| **severity** | P1 |
| **proposed_solution** | Evolve board into queue: problem column, primary CTA, reuse catalog/import list APIs; keep lanes as saved-view entry |
| **affected_files** | `workflow/page.tsx`, `admin-workflow-board.tsx` |
| **backend_change** | no |
| **risk** | Medium (IA change; avoid third bulk system) |
| **priority** | 5 |
| **phase** | 6 |

### GAP-06 — MS fields lack lock-label pattern

| Field | Value |
|-------|-------|
| **screen** | Product edit + variants |
| **existing_component** | `readOnlyClass` divs, `MoySkladProductBanner`, `MoySkladBadge` |
| **current_ux** | Read-only values; banner explains policy once |
| **problem** | TZ §26 — reason must be field-local («🔒 Управляется МойСклад»), not only disabled/muted |
| **severity** | P2 (P1 if operators still try to edit / confuse ownership) |
| **proposed_solution** | `AdminSyncedField` primitive; replace ad-hoc blocks |
| **affected_files** | `admin-product-edit-form.tsx`, `admin-variant-panel.tsx`, new primitive |
| **backend_change** | no |
| **risk** | Low |
| **priority** | 6 |
| **phase** | 2 → 7 / 9 |

### GAP-07 — Sticky section nav missing on long edit

| Field | Value |
|-------|-------|
| **screen** | `/admin/catalog/[id]/edit` |
| **existing_component** | Sections via `AdminFormSection`; sticky save bar only |
| **current_ux** | Long scroll (gallery → form → variants); mobile height pain |
| **problem** | TZ §20 — operator loses place |
| **severity** | P2 |
| **proposed_solution** | Compact sticky section nav (Основное / Фото / Варианты / SEO / МойСклад); mobile compact chips |
| **affected_files** | edit form layout |
| **backend_change** | no |
| **risk** | Low |
| **priority** | 7 |
| **phase** | 7 / 11 |

### GAP-08 — Color photo matrix under-emphasized on edit

| Field | Value |
|-------|-------|
| **screen** | Gallery on edit |
| **existing_component** | `AdminProductGallery`, `ColorCoverageSummary`, `gallery-color-coverage.ts` |
| **current_ux** | Coverage summary exists for multi-color; not full TZ §22 matrix with per-color CTA |
| **problem** | Missing colors less actionable than TZ wants |
| **severity** | P2 |
| **proposed_solution** | Elevate matrix UI + «Добавить фото» deep-link; feed readiness panel |
| **affected_files** | `admin-product-gallery.tsx` |
| **backend_change** | no |
| **risk** | Low |
| **priority** | 8 |
| **phase** | 8 |

### GAP-09 — Page chrome inconsistency

| Field | Value |
|-------|-------|
| **screen** | workflow, moysklad, import, order detail, categories |
| **existing_component** | `AdminPageHeader`, `AdminFetchErrorState` |
| **current_ux** | Mix of raw `<h1>` / plain alerts vs shared primitives |
| **problem** | Uneven hierarchy and recovery UX |
| **severity** | P2 |
| **proposed_solution** | Migrate remaining pages to shared header/error |
| **affected_files** | listed pages under `(panel)/` |
| **backend_change** | no |
| **risk** | Low |
| **priority** | 9 |
| **phase** | 3 |

### GAP-10 — No shared `AdminStatusBadge`

| Field | Value |
|-------|-------|
| **screen** | Catalog, orders, inventory, import |
| **existing_component** | Generic Badge / plain status text |
| **current_ux** | Inconsistent severity colors |
| **problem** | TZ §40 unified 🟢🟡🔴⚪ semantics |
| **severity** | P2 |
| **proposed_solution** | `AdminStatusBadge` map for product/order/stock/export states |
| **affected_files** | table components + new primitive |
| **backend_change** | no |
| **risk** | Low |
| **priority** | 10 |
| **phase** | 2 |

### GAP-11 — Bulk toolbar not unified; catalog lacks bulk category

| Field | Value |
|-------|-------|
| **screen** | `/admin/catalog`, import queue |
| **existing_component** | `AdminCatalogBulkToolbar` (hide/show); import jobs (assign/publish) |
| **current_ux** | Two metaphors; uncategorized catalog view cannot bulk-assign category |
| **problem** | TZ §11 sticky bulk toolbar with assign/hide/show/publish |
| **severity** | P2 |
| **proposed_solution** | Generalize toolbar; wire catalog assign/publish to existing `/admin/jobs/bulk` |
| **affected_files** | bulk toolbar, catalog page, import panel |
| **backend_change** | no (reuse jobs) |
| **risk** | Medium (duplicate job paths) |
| **priority** | 11 |
| **phase** | 2 → 5 |

### GAP-12 — Catalog quick-edit missing

| Field | Value |
|-------|-------|
| **screen** | `/admin/catalog` |
| **existing_component** | Table cells; visibility toggle exists |
| **current_ux** | Category/status require opening edit (except visibility) |
| **problem** | TZ §16 — safe quick edit for category / status / visibility |
| **severity** | P2 |
| **proposed_solution** | Inline/popover edit for safe fields only; never ERP fields |
| **affected_files** | `admin-catalog-table.tsx` |
| **backend_change** | no (existing PATCH) |
| **risk** | Medium (must keep publish readiness on status→active) |
| **priority** | 12 |
| **phase** | 5 |

### GAP-13 — Dashboard Action Center polish

| Field | Value |
|-------|-------|
| **screen** | `/admin` |
| **existing_component** | `AdminDashboard`, `AdminKpiCard` |
| **current_ux** | 6 KPIs + conditional attention items — already action-oriented |
| **problem** | TZ §8 wants greeting + clearer operational status; some KPI labels vs targets (e.g. «товары требующие оформления» already present); verify vanity vs action |
| **severity** | P2 |
| **proposed_solution** | Align copy/KPI set with TZ; ensure every KPI clickable; keep composing existing overviews |
| **affected_files** | `admin-dashboard.tsx` |
| **backend_change** | no |
| **risk** | Low |
| **priority** | 13 |
| **phase** | 4 |

### GAP-14 — Sidebar IA vs TZ §7

| Field | Value |
|-------|-------|
| **screen** | Shell nav |
| **existing_component** | `navigation.ts` |
| **current_ux** | Витрина / МойСклад / Операции; Операции order: Склад → Заказы → Клиенты; Import labeled «Очередь импорта» |
| **problem** | TZ wants Операции: Заказы first; МойСклад: «Импорт»; sync actions stay inside screens (already true) |
| **severity** | P2 |
| **proposed_solution** | Reorder + rename in Phase 1 IA doc then Phase 3; keep URLs |
| **affected_files** | `navigation.ts`, sidebar/mobile, ADR-012 amendment |
| **backend_change** | no |
| **risk** | Low |
| **priority** | 14 |
| **phase** | 1 → 3 |

### GAP-15 — Mobile edit IA

| Field | Value |
|-------|-------|
| **screen** | Edit @ mobile |
| **existing_component** | Sticky save + safe-area; mobile cards on lists |
| **current_ux** | Single long page; variants buried |
| **problem** | TZ §35 / §56; prior plan cited ~4500px height |
| **severity** | P2 |
| **proposed_solution** | Section nav / compact stacking; large touch targets; no critical H-overflow |
| **affected_files** | edit form, gallery, mobile nav |
| **backend_change** | no |
| **risk** | Medium (gallery DnD in compact layout) |
| **priority** | 15 |
| **phase** | 11 |

### GAP-16 — Customers list thinner than peer lists

| Field | Value |
|-------|-------|
| **screen** | `/admin/customers` |
| **existing_component** | `AdminCustomersTable`, search |
| **current_ux** | Search only; no saved views / wholesale filter chips |
| **problem** | Pattern inconsistency vs catalog/orders/inventory |
| **severity** | P2 |
| **proposed_solution** | Add views if API filter exists; else document as Phase 10 polish |
| **affected_files** | customers page/table |
| **backend_change** | minimal only if filter missing |
| **risk** | Low |
| **priority** | 16 |
| **phase** | 10 |

### GAP-17 — E2E coverage lag for Waves 8–14 + new TZ items

| Field | Value |
|-------|-------|
| **screen** | Cross-cutting |
| **existing_component** | 16 admin specs (~39 tests) through Wave 7 + palette/visibility/description |
| **current_ux** | Strong RBAC/MS/import; weak workflow board, column picker, edit readiness, next-product, unsaved |
| **problem** | Regressions in new UX will not be caught |
| **severity** | P2 (process) |
| **proposed_solution** | Add smokes per phase for new critical flows; workflow board smoke in Phase 6 |
| **affected_files** | `apps/web/e2e/*` |
| **backend_change** | no |
| **risk** | Low |
| **priority** | 17 |
| **phase** | each phase gate + 12 |

### GAP-18 — Event / audit timeline (deferred)

| Field | Value |
|-------|-------|
| **screen** | Order detail, product edit, MS integration |
| **existing_component** | MS sync logs on integration page |
| **current_ux** | Point-in-time state |
| **problem** | Best-in-class from old plan; not required for primary merchandising speed |
| **severity** | P2 (defer) |
| **proposed_solution** | **Defer** unless operator escalates — needs backend event feed |
| **affected_files** | N/A now |
| **backend_change** | yes (if pursued) |
| **risk** | High scope |
| **priority** | 99 |
| **phase** | deferred |

---

## 5. Reuse plan

| Need | Action |
|------|--------|
| Readiness UI | **Create** `AdminReadinessPanel` wrapping existing helpers |
| Next item | **Create** `AdminNextItemNavigation` + extend `catalog-list-url.ts` |
| Unsaved guard | **Create** hook; wire edit form |
| MS lock fields | **Create** `AdminSyncedField` |
| Status colors | **Create** `AdminStatusBadge` |
| Filter bar | **Compose** existing search/chips/views |
| Bulk toolbar | **Extend/generalize** catalog toolbar; reuse jobs API |
| Section chrome | **Extend** `AdminFormSection` / use `AdminPageHeader` |
| Workflow queue | **Extend** board + reuse list/import patterns |
| Command palette | **Extend** commands only if audit of actions incomplete |

**Do not rebuild:** `AdminDataTable`, saved views, command palette shell, bulk job progress, gallery color tagging core, sticky save, MS banner, mobile drawer, overview APIs.

---

## 6. Backend change candidates

| Candidate | Verdict |
|-----------|---------|
| `publish_blockers` on GET | Optional polish — FE mirror sufficient for Phases 2–7 |
| Unified `workflow-summary` | **Do not build** — ADR-012 + overview APIs |
| Next-in-queue API | **Prefer FE** using filtered product list |
| User-persisted saved views DB | **Defer** — system URL views exist |
| Bulk hide/show jobs | Defer unless operators regularly select 20+ |
| Event timeline API | Defer (GAP-18) |

**Severity-blocking API gaps:** none.

---

## 7. Test inventory to protect

| Spec | Protects |
|------|----------|
| `admin-login-smoke.spec.ts` | Auth redirect + dashboard |
| `admin-catalog-smoke.spec.ts` | IA, MS create redirect, stock column, return context, viewer RBAC |
| `admin-categories-smoke.spec.ts` | Category CRUD |
| `admin-moysklad-smoke.spec.ts` | MS read-only price/SKU |
| `admin-inventory-smoke.spec.ts` | Read-only stock, return links |
| `admin-orders-smoke.spec.ts` | List + detail |
| `admin-customers-smoke.spec.ts` | Search + nav |
| `admin-rbac-smoke.spec.ts` | Viewer permissions |
| `admin-command-palette-smoke.spec.ts` | Cmd+K |
| `admin-visibility-toggle-smoke.spec.ts` | Visibility + bulk |
| `admin-product-description-save.spec.ts` | Save stay intent |
| `admin-wave5-smoke.spec.ts` | Export-pending attention |
| `admin-wave6-smoke.spec.ts` | Import bulk assign |
| `admin-wave7-smoke.spec.ts` | Color photos, gallery coverage, bulk publish, import checklist |
| `admin-wholesale-smoke.spec.ts` | Wholesaler list |
| `mobile-admin.spec.ts` | Mobile shell + customers cards |

**Must add when features ship:** readiness on edit, next-product, unsaved guard, workflow queue actions, column picker smoke, mobile edit smoke.

---

## 8. Phase mapping (post-audit)

| Phase | Focus | Gaps |
|-------|-------|------|
| **1** | IA v2 doc + ADR-012 amendment draft | GAP-14 |
| **2** | Shared primitives | GAP-01/03/06/10/11 shells |
| **3** | Shell chrome consistency | GAP-09, GAP-14 implement |
| **4** | Dashboard Action Center polish | GAP-13 |
| **5** | Catalog list (bulk/quick-edit/views) | GAP-11, GAP-12 |
| **6** | Workflow → action queue | GAP-05 |
| **7** | Product editor (highest value) | GAP-01,02,03,04,06,07 |
| **8** | Gallery + color matrix | GAP-08 |
| **9** | Variants MS display | GAP-06 (variants) |
| **10** | Orders + inventory + customers parity | GAP-16 |
| **11** | Mobile | GAP-15 |
| **12** | Polish, a11y, perf, E2E expansion | GAP-17 |
| **Deferred** | Timelines, TipTap, user saved views, auto-publish | GAP-18 + backlog |

---

## 9. Prod smoke notes

- `https://сухопут-кмв.рф/admin` → login (auth wall; no credentials invented).
- Login page clean; no storefront chrome leakage.
- Prior `prod-admin-*.png` show Action Center + import checklist; catalog screenshots may predate Wave 8–9 UI — **re-smoke authenticated prod after Phase 7/11**.

---

## 10. Definition of Phase 0 done

- [x] Routes + components + primitives inventoried
- [x] API reuse matrix + backend_change policy
- [x] Screen findings with TZ 10-column schema
- [x] Doc vs code drift called out
- [x] Critical gaps confirmed in code
- [x] Reuse plan (extend vs create)
- [x] E2E inventory + coverage gaps
- [x] Phase mapping for Phases 1–12
- [x] Verifier **APPROVED WITH NOTES** (2026-08-11) — schema aliases documented; PM updated

---

## 11. Stop rule

Phase 0 gate passed. **Next:** Phase 1 only — `docs/ux/admin-ia-v2.md` (docs only, no UI code). Do not start Phase 2+ without IA approval.