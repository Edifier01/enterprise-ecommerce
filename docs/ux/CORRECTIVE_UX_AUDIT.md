# CORRECTIVE UX AUDIT — «Сухопут»

**Task ID:** UX-AUDIT-001  
**Date:** 2026-08-12  
**Mode:** Repository analysis only — **no application code changed**  
**Role:** Senior Product Designer + UX Architect + Frontend Architect + Project Orchestrator  

---

## 0. Executive Verdict

Previous ECOMMERCE UX V2 / Admin UX v2 phases (docs mark Phases 0–12 “complete”) delivered **foundations and partial IA**, but **did not close the structural gap** against this corrective TZ.

Evidence from code + production screenshots:

| Surface | What exists | What TZ requires | Verdict |
|---------|-------------|------------------|---------|
| Storefront header | 4 desktop strips (utility + trust + logo/search + categories) | 2-row compact ecommerce chrome | **IA gap (P0)** |
| Homepage | Intro + tabbed product sections + SEO block | Hero → Categories → Recommendations → New → Sale → Trust → Footer | **IA gap (P0)** |
| Product card | Image / name / price / stock / CTA present | Same hierarchy, correct image | Structure OK; **data integrity P0** |
| PDP variants | Structured selector **or** `FlatVariantSelector` with `variant.name` | Attribute pills only (`[39][40]…`) | **Critical when attributes missing (P0)** |
| Admin dashboard | Action Center exists, but **KPI grids render first** | “What to do now” is primary | **Hierarchy gap (P0)** |
| Product editor | 2-col gallery + form, readiness, next nav, save stay/close | Operator workspace + Save&Next + compact variants + ERP secondary | **Partial — last-mile gaps (P0/P1)** |
| Gallery by color | `AdminGalleryColorMatrix` with counts | Merchandising tool by color | **Mostly met** |
| Image mismatch (sneakers vs camo suit) | Pipeline is deterministic per product fields | Correct product↔image association | **Data/pipeline integrity P0 — not a CSS bug** |

**Principle for next work:** change information architecture and operator/buyer workflows. Cosmetics (radius, padding, shadows, icon swaps) alone are **out of scope** for “done”.

---

## 1. Current Storefront Architecture

### 1.1 Routes (`apps/web/src/app`)

| Route | File |
|-------|------|
| `/` | `page.tsx` |
| `/catalog`, `/catalog/[slug]` | `catalog/page.tsx`, `catalog/[slug]/page.tsx` |
| `/products/[slug]` | `products/[slug]/page.tsx` |
| `/search` | `search/page.tsx` |
| `/cart`, `/checkout`, `/checkout/confirmation` | checkout pages |
| `/about`, `/contacts`, `/delivery`, `/payment`, `/returns` | info pages |
| Auth / account | `/login`, `/register`, `/account`, … |
| `/offline` | PWA offline |

Chrome: `layout.tsx` + `components/store/layout/conditional-store-chrome.tsx`.

### 1.2 Header / Footer

| Piece | Path | Notes |
|-------|------|-------|
| Header shell | `components/store/layout/store-header.tsx` | Explicitly **4 rows** (comment: stich.su-inspired) |
| Utility | `top-bar.tsx` | Contacts / buyers / order status / phone |
| Trust USP | `trust-bar.tsx` | 4 USP columns — desktop only |
| Logo + search + account + cart | `main-header.tsx` | Search own band; no ♡ favorites |
| Category nav | `category-mega-menu.tsx` | Separate sticky row under main header |
| Mobile | drawer + search toggle + `mobile-bottom-nav.tsx` | TopBar/TrustBar hidden |
| Footer | `site-footer.tsx` | Columns from `site-config.ts` |

**Target (TZ §7.1):** utility row + single main row (`СУХОПУТ │ Каталог │ Новинки │ Распродажа │ 🔍 │ ♡ │ 🛒`).  
**Gap:** TrustBar is a full extra strip; primary commerce links are not in the logo row; favorites route/UI absent; category mega-menu remains a 4th band.

### 1.3 Homepage IA

`app/page.tsx` currently:

1. `HomepageIntro` (brand + quick links)  
2. Optional `PromoBanner` (**gated off** via `siteConfig.homepagePromosEnabled`)  
3. `SectionTabs` — **tabs** Рекомендации / Новинки / Распродажа (not stacked sections)  
4. `SeoContentBlock` (about/SEO text)

**Missing vs TZ §8:** dedicated **КАТЕГОРИИ** band; stacked recommendation/new/sale sections; denser vertical rhythm (`space-y-10 sm:space-y-12` reinforces empty feel).

### 1.4 Product Card

`components/store/catalog/product-card.tsx` + `product-grid.ts` + `product-thumbnail.tsx`:

- Image (4:5, `object-cover`)
- Name
- Optional color dots
- Price / sale / wholesale
- Stock badge
- CTA: quick-add (single variant) or «Купить» → PDP

Purchase hierarchy is **mostly aligned**. Remaining issues: wrong image data; density/whitespace on PLP/home grids.

### 1.5 Product Page (PDP)

`product-detail.tsx` + `product-purchase-panel.tsx` + `variant-selector.tsx` + `product-info-sections.tsx`:

- Breadcrumbs, gallery + purchase column
- Price + stock from **selected** variant when resolved
- Structured color swatches / size pills when `option_groups` usable
- Else **`FlatVariantSelector` renders full `variant.name`** (ERP-style labels)
- Description / specs / delivery-returns links / trust / related

### 1.6 Design tokens & primitives

- Tokens: `apps/web/src/app/globals.css` (`--store-cta`, olive primary, etc.)
- Config: `lib/store/site-config.ts`
- Store UI: `components/store/ui/*` (empty/error/skeleton/status)
- Shared: shadcn `button`, `card`, `badge` under `components/ui/`

**Do not** add a new UI library for this corrective work.

---

## 2. Current Admin Architecture

### 2.1 Routes (`apps/web/src/app/admin`)

| Route | Purpose |
|-------|---------|
| `/admin/login` | Auth |
| `/admin` | Dashboard |
| `/admin/catalog`, `/workflow`, `/categories`, `/new`, `/[id]/edit` | Merchandising |
| `/admin/integrations/moysklad`, `…/import` | Sync + import queue |
| `/admin/orders`, `/orders/[orderNumber]` | Orders |
| `/admin/inventory` | Stock |
| `/admin/customers` | Customers |

### 2.2 Sidebar IA

`lib/admin/navigation.ts` — v2 groups: Сводка · Витрина · МойСклад · Операции. Matches `docs/ux/admin-ia-v2.md`.

### 2.3 Dashboard

`admin-dashboard.tsx` order today:

1. Page header + greeting (“N задач требуют внимания”)  
2. **Операции KPI grid** (import / styling / color photos / low stock)  
3. **Продажи KPI grid**  
4. `AdminActionCenter` (list with CTAs)  
5. Orders-by-status card  

TZ wants Action Center / “что делать сейчас” as **primary**. Functionally items exist; **visual primacy is KPI-first**.

### 2.4 Import workflow

`moysklad-import-panel.tsx` + bulk jobs:

- Queue of MS products without category
- Readiness checklist column
- Bulk assign category / publish
- Edit links with `from=/admin/integrations/moysklad/import…`
- Inline hide

Still multi-hop for photo/gallery (expected), but workflow spine exists.

### 2.5 Product editor

`admin-product-edit-form.tsx`:

- MS banner + readiness + preview
- Desktop: gallery left / main form right; variants **below** as card forms
- Sticky save: `intent=stay` («Сохранить») / `intent=close` («Сохранить и закрыть»)
- `AdminNextItemNavigation` (prev/next) — **not** combined Save&Next
- Unsaved guard: `hooks/use-admin-unsaved-guard.ts` (beforeunload + cancel); next-link wiring incomplete vs TZ
- Contextual `from` via `lib/admin/catalog-list-url.ts`

### 2.6 Gallery / colors / variants / ERP

| Feature | Implementation | TZ fit |
|---------|----------------|--------|
| Color matrix | `admin-gallery-color-matrix.tsx` + `gallery-color-coverage.ts` + API `color_gallery_coverage.py` | Strong |
| Variants UI | `admin-variant-panel.tsx` — **per-variant cards** with locked MS fields | Compact table **missing** |
| ERP lock | `AdminSyncedField`, sync_guard backend | Correct ownership; **not collapsed** |
| Readiness | `merchandising-readiness.ts` + `AdminReadinessPanel` | Actionable links partial; checklist still coarse |

### 2.7 Admin primitives (reuse first)

`AdminPageHeader`, `AdminFormSection`, `AdminDataTable`, `AdminEmptyState`, `AdminErrorState*`, `AdminSavedViews`, `AdminFilterChips`, `AdminBulkToolbar`, `AdminStatusBadge`, `AdminSyncedField`, `AdminReadinessPanel`, `AdminNextItemNavigation`, `AdminConfirmDialog`, `AdminKpiCard`, `AdminActionCenter`, `AdminBulkJobProgress`, `AdminMobileCard`, command palette.

**Missing primitive:** Save & Next action (intent + navigation).

---

## 3. Current Data Flows

### 3.1 Product / image pipeline

```text
MoySklad product/variant image
        ↓ sync (erp_image_url / download proxy)
Product.image_url  (site-owned primary)
        ↓
product_images gallery (option_color tags)
        ↓
API serializers._resolve_public_image_url:
  image_url → first usable gallery → /api/v1/products/{slug}/erp-image
        ↓
Frontend resolveCatalogProductImageSrc / ProductThumbnail
  (+ client error fallback to erp-image proxy → placeholder)
        ↓
Product Card / PDP Gallery / Cart snapshot
```

Key files:

- API: `apps/api/app/features/catalog/presentation/serializers.py`
- Web: `apps/web/src/lib/store/product-image.ts`, `product-thumbnail.tsx`, `product-detail.tsx` (`buildGalleryImages`)
- Cart snapshot gap: gallery fallback weaker than catalog (`CartService` / cart image resolution — gallery not always used)

**Mismatch root-cause class (sneakers title + camo suit photo):**  
Frontend does **not** invent cross-product images. Wrong visual means wrong `image_url` / gallery row / `erp_image_url` on that product (or MS source image). Fix in Phase 1 must be **data + sync association audit**, not hiding with CSS.

### 3.2 Variant / attributes flow

```text
MS characteristics[{name,value}]
        ↓ http_client._map_variant
attributes keys: exact casefold map
  "размер"|"size" → size
  "цвет"|"color" → color
  other names kept as-is (e.g. "размер ремня" ≠ size)
        ↓
build_option_groups / uses_structured_selector
        ↓
Storefront VariantSelector OR FlatVariantSelector(variant.name)
```

Files:

- `apps/api/.../moysklad/infrastructure/http_client.py` (`_map_variant`)
- `apps/api/.../catalog/domain/variant_options.py`
- `apps/web/src/lib/store/variant-options.ts`
- `apps/web/src/components/store/catalog/variant-selector.tsx`

**Critical:** products whose size lives only in `variant.name` (e.g. `… (39)`) or in non-canonical characteristic names fall back to ERP labels on the storefront.

### 3.3 Stock / availability

- Domain: `stock_availability.py` — storefront in-stock when `available_quantity >= storefront_min_available_stock` (default **3**)
- PDP: `inStock` from selected variant when selected; CTA disabled when OOS
- Structured selector: OOS values disabled/struck
- Flat selector: disabled when `!variant.in_stock`
- Risk: product-level badge can feel “Нет в наличии” if default selection is OOS while other sizes exist — must verify default-pick prefers in-stock

### 3.4 Readiness / publish

Frontend blockers: category, site-owned photo (ERP alone insufficient), color gallery coverage.  
Backend validates MS draft→active; bulk publish skips blockers.  
Checklist still includes “Опубликован” as a checkbox item rather than TZ’s problem-centric actionable list (name/description/main photo/color-specific photo).

---

## 4. Components Inventory (high-signal)

### Storefront

`store-header`, `main-header`, `top-bar`, `trust-bar`, `category-mega-menu`, `site-footer`, `homepage-intro`, `section-tabs`, `product-card`, `product-grid`, `product-detail`, `product-gallery`, `product-purchase-panel`, `variant-selector`, `product-info-sections`, `product-sticky-bar`, cart/checkout clients.

### Admin

`admin-dashboard`, `admin-action-center`, `moysklad-import-panel`, `admin-product-edit-form`, `admin-product-gallery`, `admin-gallery-color-matrix`, `admin-variant-panel`, `admin-readiness-panel`, `admin-next-item-navigation`, `admin-synced-field`, catalog table/bulk toolbar/workflow queue.

---

## 5. API Contracts / Server Actions / Tests

### Storefront data

- Client: `lib/api.ts` — `listProducts`, `getProduct`, facets, search (Server Components; no product server actions)

### Admin actions

- `app/actions/admin-catalog.ts` — product update, media, gallery, preview token  
- `app/actions/admin-moysklad.ts` — sync, assign, bulk hide/show/publish  
- `app/actions/admin-bulk-jobs.ts` — background assign/publish  

### Tests (existing)

- Storefront E2E: `homepage`, `storefront-smoke`, `search-smoke`, `mobile-storefront`, checkout/wholesale smokes  
- Admin E2E: waves 5–16, visibility, description save, MS, RBAC, mobile-admin  
- API: `test_product_serializers`, `test_variant_options`, `test_merchandising_readiness`, `test_moysklad_*`, admin catalog/bulk  

Corrective work must extend E2E around header IA, PDP attribute-only variants, Save&Next, dashboard primacy — not only unit/tsc.

---

## 6. Gap Analysis Table

| ID | Область | Сейчас | Требуется | Gap | Приоритет | Файлы |
|----|---------|--------|-----------|-----|-----------|-------|
| UX-001 | Storefront Header | 4 полосы: TopBar + TrustBar + MainHeader + CategoryNav; нет ♡; каталог/новинки/sale не в logo-row | 2-row compact ecommerce nav с реальными routes | Полная IA шапки | **P0** | `store-header.tsx`, `main-header.tsx`, `top-bar.tsx`, `trust-bar.tsx`, `category-mega-menu.tsx`, `site-config.ts` |
| UX-002 | Homepage IA | Intro + **tabs** products + SEO; нет отдельного блока категорий; крупный vertical spacing | Hero → Categories → stacked Rec/New/Sale → Trust → Footer | Секции и плотность | **P0** | `app/page.tsx`, `homepage-intro.tsx`, `section-tabs.tsx`, category grid reuse |
| UX-003 | Product Card hierarchy | Поля есть; image/data могут врать | Image/name/price/stock/CTA; без ERP-шума | В основном OK; QA + data | **P1** | `product-card.tsx`, `product-grid.ts` |
| UX-004 | Product↔Image integrity | Pipeline корректный; prod показывает mismatch (кроссовки / камуфляж) | Каждое фото соответствует товару | **Data/sync**, не CSS | **P0** | serializers, MS sync images, admin gallery, prod DB audit for slug `krossovki-elkland-178e` |
| UX-005 | PDP purchase IA | 2-col есть; fallback description; delivery/trust частично | Gallery \| buy column; description/specs/trust below | Дожать структуру и copy | **P1** | `product-detail.tsx`, `product-info-sections.tsx` |
| UX-006 | Variant labels | `FlatVariantSelector` → `variant.name` (ERP) при слабых attributes | Только attribute pills | Нормализация + UI fallback | **P0** | `variant-selector.tsx`, `variant-options.py/.ts`, MS `_map_variant` |
| UX-007 | Stock UX vs selection | Selected variant drives stock/CTA; default may be OOS | Availability + CTA follow selection; OOS disabled | Harden default + messaging | **P0** | `product-purchase-panel.tsx`, `variant-options.ts`, stock domain |
| UX-008 | Favorites | Нет wishlist UI/route | ♡ в header (TZ) | Нет feature — scope decision | **P2** | new or defer; do not fake |
| UX-009 | TrustBar placement | Отдельная полоса в header | Trust на homepage/footer, не раздувать header | Перенос контента | **P1** | `trust-bar.tsx`, homepage, footer |
| UX-010 | Cart images | Snapshot image path weaker than catalog gallery | Same integrity as PLP | Align resolver | **P1** | cart image resolution (API + `cart-line-preview.tsx`) |
| UX-011 | Checkout provider copy | Stripe/stub UI language | YooKassa (ADR-004) — parallel track | Out of corrective UX core but release risk | **P1** (release) | checkout components — **coordinate, don’t rewrite casually** |
| UX-012 | Admin Dashboard primacy | KPI grids **before** Action Center | Action Center first + clear CTAs | Reorder + CTA emphasis | **P0** | `admin-dashboard.tsx`, `admin-action-center.tsx` |
| UX-013 | Import as workflow | Queue + bulk + `from` работают | Minimize hops; clear next step | Polish queue→edit→next | **P1** | `moysklad-import-panel.tsx`, edit return paths |
| UX-014 | Editor as workspace | 2-col + readiness + sticky save | Workspace + sticky readiness + less form sprawl | Partial | **P0** | `admin-product-edit-form.tsx`, section nav |
| UX-015 | Readiness actionable | Checklist category/photo/published + some links | Problem count + per-issue jump (incl. color name) | Enrich checklist model/UI | **P0** | `merchandising-readiness.ts`, `admin-readiness-panel.tsx` |
| UX-016 | Gallery by color | Matrix with counts/status | Same + click opens color context | Mostly done; wire context selection | **P1** | `admin-product-gallery.tsx`, matrix |
| UX-017 | ERP secondary | Banner + locked fields; always visible | Collapsed secondary panel | Collapse/disclosure | **P1** | edit form, `admin-variant-panel.tsx`, banner |
| UX-018 | Variants compact table | Tall cards per variant | Table color/size/SKU/stock/photo + expand ERP | New presentation (reuse data) | **P0** | `admin-variant-panel.tsx` |
| UX-019 | Save & Next | Save stay + Save close + Next link | Save / Save&Close / **Save&Next** | Missing intent | **P0** | `admin-product-edit-form.tsx`, `admin-catalog.ts`, next-item helpers |
| UX-020 | Contextual return | `from=` parse + close works | Preserve; Save&Close returns | Mostly OK — regression-guard | **P1** | `catalog-list-url.ts` |
| UX-021 | Unsaved → Next | Guard on unload/cancel | Guard next/prev navigation | Incomplete | **P1** | `use-admin-unsaved-guard.ts`, next nav |
| UX-022 | Attribute mapping hygiene | Only exact `размер`/`size`, `цвет`/`color` | Map waist/belt/size aliases; parse name `(39)` if needed | Backend ACL enrichment | **P0** | `http_client._map_variant`, optional name parser |
| UX-023 | Homepage categories | Categories only via nav/quick links | Visible category band on home | Missing section | **P0** | `page.tsx`, `category-grid.tsx` |
| UX-024 | Mobile storefront header | Compact-ish mobile; desktop tall | Desktop compact + mobile usable | Desktop primary gap | **P0**/P1 | header components |
| UX-025 | Mobile admin editor | Section nav mobile; sticky actions | Usable editor/gallery/variants | Verify after workspace change | **P1** | edit form, gallery, variants |
| UX-026 | Docs drift | Prior audits mark UX V2 “done” | Corrective baseline | Treat prior “complete” as **stale vs this TZ** | **P2** | `docs/ux/*`, PM files |

---

## 7. Critical Bugs / Data Issues

1. **Wrong product image on storefront** (`Кроссовки Элкланд 178E` vs camo apparel visual) — **P0 data integrity**. Audit prod rows: `image_url`, gallery URLs, `erp_image_url`, MS media href. Do not “fix” by hardcoding storefront overrides.
2. **ERP names on PDP** when structured options unavailable — **P0 UX**.
3. **Characteristic alias gap** (`размер ремня`, etc.) not mapped → size axis empty — **P0 data contract**.
4. **Storefront min stock = 3** vs admin copy “мало” at other thresholds — document consistently; changing threshold is a **business decision**, not silent UI tweak.
5. **Deploy lag risk:** screenshots may show older editor layouts; code has 2-col workspace pieces. Always Visual QA against **production** after deploy.

---

## 8. UX Priorities Summary

### Storefront

| Priority | Count (IDs) |
|----------|-------------|
| P0 | UX-001, UX-002, UX-004, UX-006, UX-007, UX-022, UX-023, UX-024 |
| P1 | UX-003, UX-005, UX-009, UX-010, UX-011 |
| P2 | UX-008, UX-026 |

### Admin

| Priority | Count (IDs) |
|----------|-------------|
| P0 | UX-012, UX-014, UX-015, UX-018, UX-019 |
| P1 | UX-013, UX-016, UX-017, UX-020, UX-021, UX-025 |
| P2 | UX-026 |

---

## 9. Recommended Implementation Order

Aligned with TZ §30; refined by dependencies.

### Phase 0 — Audit (this document) ✅

- Deliverable: `docs/ux/CORRECTIVE_UX_AUDIT.md`
- No UI code

### Phase 1 — Data integrity (block storefront polish until green)

| Task | Goal | Acceptance |
|------|------|------------|
| DATA-001 | Trace image mismatch for known slug(s) | Root cause class: MS / gallery / primary / cache |
| DATA-002 | Attribute mapping aliases + optional name `(NN)` parse | Option groups for size footwear without ERP button labels |
| DATA-003 | Cart/PDP/PLP image parity | Same source priority; no silent wrong ERP |
| DATA-004 | Default variant prefers in-stock | Badge/CTA match selectable available size |

**Must NOT change:** pricing source, MS ownership guards, auth/RBAC, checkout payment provider logic (except coordinated ADR-004 track).

### Phase 2 — Storefront IA

1. Header compact 2-row (reuse routes; relocate TrustBar content)  
2. Homepage stacked sections + categories  
3. Card QA  
4. PDP attribute-only variants + stock/CTA  
5. Responsive Visual QA  

### Phase 3 — Admin operator workspace

1. Dashboard Action Center first  
2. Import workflow polish  
3. Editor workspace (readiness sticky/actionable, ERP collapse)  
4. Compact variants table  
5. Save&Next + unsaved on next  
6. Gallery color context click-through  

### Phase 4 — Polish

Spacing, focus, loading/empty/error, skeletons — **only after** IA tasks pass acceptance.

---

## 10. Task Breakdown (for orchestrator — do not implement yet)

### TASK UX-SF-HEADER-001

- **GOAL:** Compact 2-row storefront header  
- **CURRENT:** 4 strips  
- **TARGET:** Utility + logo/nav/search/cart (favorites deferred or stub decision)  
- **FILES:** header layout components, `site-config.ts`  
- **DEPS:** none  
- **ACCEPTANCE:** Desktop first viewport shows ≤2 header bands; existing category routes reachable; mobile drawer still works  
- **TESTS:** `homepage.spec.ts`, `mobile-storefront.spec.ts` update  

### TASK UX-SF-HOME-001

- **GOAL:** Homepage IA without empty voids  
- **CURRENT:** tabs + sparse spacing  
- **TARGET:** categories + stacked merch sections  
- **FILES:** `page.tsx`, intro, section composition, `category-grid`  
- **DEPS:** none (fake products forbidden)  
- **ACCEPTANCE:** No duplicate section components; empty sections omitted when no data  
- **TESTS:** homepage E2E  

### TASK UX-SF-VAR-001

- **GOAL:** No ERP names in storefront variant UI  
- **CURRENT:** FlatSelector shows `variant.name`  
- **TARGET:** size/color pills only  
- **FILES:** variant selector + attribute mapping  
- **DEPS:** DATA-002  
- **ACCEPTANCE:** Footwear size product shows `[39]…[46]` not full MS name  
- **TESTS:** API variant_options + storefront smoke  

### TASK UX-SF-IMG-001

- **GOAL:** Correct product images  
- **CURRENT:** mismatch on prod example  
- **TARGET:** verified mapping  
- **FILES:** sync/serializers only if bug; else ops data fix  
- **DEPS:** DATA-001  
- **ACCEPTANCE:** Named SKU/slug shows matching visual; documented if MS source wrong  

### TASK UX-AD-DASH-001

- **GOAL:** Dashboard answers “what now?”  
- **CURRENT:** KPI before Action Center  
- **TARGET:** Action Center primary with CTAs  
- **FILES:** `admin-dashboard.tsx`  
- **DEPS:** none  
- **ACCEPTANCE:** First content block is attention queue; KPI secondary  
- **TESTS:** admin smoke  

### TASK UX-AD-EDIT-001

- **GOAL:** Editor workspace + Save&Next + compact variants + ERP secondary  
- **CURRENT:** Partial 2-col; cards; no Save&Next  
- **TARGET:** TZ §17–25  
- **FILES:** edit form, variant panel, readiness, actions  
- **DEPS:** readiness enrichment  
- **ACCEPTANCE:** DoD admin checklist items for editor/save/next/from  
- **TESTS:** description-save, wave16 next/unsaved, new Save&Next E2E  

---

## 11. Files That Must Change (expected)

### Storefront (Phase 2+)

- `apps/web/src/components/store/layout/store-header.tsx`
- `apps/web/src/components/store/layout/main-header.tsx`
- `apps/web/src/components/store/layout/top-bar.tsx`
- `apps/web/src/components/store/layout/trust-bar.tsx` (relocate/repurpose)
- `apps/web/src/components/store/layout/category-mega-menu.tsx` (integrate, don’t delete nav)
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/store/marketing/homepage-intro.tsx`
- `apps/web/src/components/store/catalog/section-tabs.tsx` (compose stacked or replace usage)
- `apps/web/src/components/store/catalog/variant-selector.tsx`
- `apps/web/src/components/store/catalog/product-purchase-panel.tsx`
- `apps/web/src/lib/store/variant-options.ts`
- `apps/web/src/lib/store/site-config.ts`
- Possibly `product-card.tsx` / `product-detail.tsx` for hierarchy only

### Admin (Phase 3+)

- `apps/web/src/components/admin/admin-dashboard.tsx`
- `apps/web/src/components/admin/admin-action-center.tsx`
- `apps/web/src/components/admin/catalog/admin-product-edit-form.tsx`
- `apps/web/src/components/admin/catalog/admin-variant-panel.tsx`
- `apps/web/src/components/admin/admin-readiness-panel.tsx`
- `apps/web/src/lib/admin/merchandising-readiness.ts`
- `apps/web/src/app/actions/admin-catalog.ts` (Save&Next intent)
- `apps/web/src/components/admin/admin-next-item-navigation.tsx`
- `apps/web/src/hooks/use-admin-unsaved-guard.ts`
- Gallery matrix wiring tweaks

### Backend (only if Phase 1 proves need)

- `apps/api/.../moysklad/infrastructure/http_client.py` — attribute key aliases / name parse  
- Possibly serializers/cart image helpers  
- **Avoid** schema migrations unless data model truly insufficient  

### Docs / PM

- This audit; later TASK updates in `.cursor/project-management/*`

---

## 12. Files That Must NOT Change (without explicit decision)

| Area | Paths / systems | Why |
|------|-----------------|-----|
| MoySklad ownership guards | `sync_guard.py`, synced field write paths | Source of truth for SKU/price/stock |
| Auth / RBAC | admin auth, permissions | Security |
| DB schema | Alembic migrations | Not required for UX IA |
| Checkout/payment core | YooKassa/Stripe domain | ADR-004 parallel track |
| Order state machine | orders domain | Out of scope |
| Pricing calculation | catalog price sources | MS retail/wholesale |
| Publish blocker **policy** (category + site photo + color photos) | merchandising_readiness domain | May **enrich UX**, not silently remove rules |
| OpenAPI contract casually | public ProductSchema fields | Extend carefully if new fields needed |
| shadcn wholesale replace | new UI kit | Forbidden by TZ |

---

## 13. Architecture Risks

1. **False “UX complete” status** in PM docs → agents stop at cosmetics. Corrective epic must supersede “Admin UX v2 complete” for this TZ.  
2. **Attribute normalization** touches MS ACL — regression risk on filters/facets. Need API tests.  
3. **Header IA** may break E2E locators (already fragile — CI Playwright red). Update tests in same PR.  
4. **Save&Next** must respect `from` queue filters (`resolveAdminNextProductId`) or operators loop wrong lists.  
5. **Prod vs code skew** — Visual QA only on deployed URLs (`.cursor/VERIFICATION.md`).  
6. **Favorites (♡)** — no backend; implementing full wishlist is scope creep. Prefer defer (P2) or non-functional placeholder only with product decision.  
7. **Image mismatch** may be MS master data — engineering alone cannot invent correct photos.

---

## 14. Estimated Complexity

| Phase | Effort (eng days, 1 FE-focused) | Risk |
|-------|----------------------------------|------|
| Phase 0 Audit | 0.5–1 | Low |
| Phase 1 Data integrity | 2–4 | Medium–High (prod data) |
| Phase 2 Storefront IA | 3–5 | Medium (E2E churn) |
| Phase 3 Admin workspace | 4–7 | Medium (editor surface) |
| Phase 4 Polish | 1–2 | Low |
| **Total** | **~11–19 eng days** | — |

Complexity class: **L (Large)** — orchestrate as small PRs per task IDs above; no rewrite.

---

## 15. Definition of Done (gate for later phases)

Use TZ §33 checklists. Cosmetic-only PRs **fail** DoD even if tsc/lint green.

Visual QA mandatory on production URLs after each phase deploy.

---

## 16. Sources

- Code: `apps/web/src/app/**`, `components/store/**`, `components/admin/**`, `lib/store/**`, `lib/admin/**`
- API: `apps/api/app/features/catalog/**`, `integrations/moysklad/**`
- Prior (now superseded for this TZ): `docs/ux/ecommerce-ux-audit.md`, `ecommerce-ux-v2-architecture.md`, `admin-ux-audit.md`, `admin-ia-v2.md`
- Screenshots provided 2026-08-12 (storefront + admin)
- PM: `.cursor/project-management/CURRENT_CONTEXT.md`, `HANDOFF.md`

---

## 17. Next Action

**Stop.** Await approval to start **Phase 1 (DATA-001…)** only.

Do **not** launch implementation agents for Phase 2/3 until Phase 1 root causes are written up.

---

## 18. Phase 1 Findings — Data Integrity (2026-08-12)

### DATA-001 — Image mismatch (`krossovki-elkland-178e`)

Prod API evidence:

- `image_url`: `/media/a7413a6e37d04aa6904d246006abe945.webp` (site-owned; wrong visual — camo apparel)
- `images`: `[]`
- No engineering bug in resolver order (`image_url` → gallery → ERP proxy). Site-owned primary correctly wins (ADR-010).

**Ops action required (not code):** clear/replace that media file in admin gallery/primary image with the real sneakers photo. Do not ship a storefront hardcode.

### DATA-002 — Variant attributes → option groups

Prod variants used `"размер обуви": "39"` (not `size`) → `option_groups: []` → FlatVariantSelector showed full ERP names.

**Code fix shipped:**

- `variant_attribute_normalize.py` — alias map + `(39)` name parse
- Wired into `variant_options.py`, `variant_filter.py` (no more full-name size facets), MS `_map_variant`, frontend `variant-options.ts`

### DATA-003 — Cart image parity

Cart snapshot now uses `image_url` → first gallery URL → ERP proxy (skips missing `/media/` files), matching catalog priority.

### DATA-004 — Default variant stock

Default selection prefers an in-stock variant when the flagged default is OOS (matches prod: 39 OOS, 42–45 available).

### Tests

`pytest tests/test_variant_attribute_normalize.py tests/test_variant_options.py tests/test_product_serializers.py` — 15 passed.

---

## 19. Phase 2 Findings — Storefront IA (2026-08-12)

### Header (UX-001)

- Removed TrustBar from header chrome (USP moved to homepage).
- Sticky band: logo + `primaryNav` (Каталог / Новинки / Распродажа) + category mega + search + cart.
- Desktop utility TopBar retained (Контакты / Покупателям / Оптовикам + статус + телефон).
- Favorites (♡) deferred — no wishlist backend.

### Homepage (UX-002 / UX-023)

- IA: Intro → Categories → stacked Рекомендации / Новинки / Распродажа → TrustBar → About/SEO.
- Replaced tabbed `SectionTabs` with `HomepageProductSections` (empty sections omitted).
- Reduced vertical spacing (`space-y-8` / `space-y-10`).

### Variants (UX-006 follow-up)

- `FlatVariantSelector` shows normalized size/color labels (not full ERP names) when structured groups unavailable; legend becomes «Размер» when all variants have size.

---

## 20. Phase 3 Findings — Admin operator workspace (2026-08-12)

### Dashboard (UX-012)

- `AdminActionCenter` renders **before** Operations / Sales KPI grids.
- Action rows show explicit **«Обработать →»** CTA beside counts.

### Editor (UX-019 / readiness / ERP)

- Sticky bar: Save / Save&Close / **Save&Next** (`intent=next` → redirect to next queued product with `from` preserved).
- `AdminNextItemNavigation` uses unsaved guard (`confirmLeave` + `data-unsaved`).
- ERP price block collapsed by default (`<details>`).
- Readiness: problem count badge, checklist/blocker deep-links to `#section-basics` / `#section-gallery`.

### Variants (compact table)

- MoySklad products: compact row table (color, size, SKU, stock, photo coverage, sort/default).
- Full ERP fields under per-row disclosure.

### Tests

- `npx tsc --noEmit` clean.
- E2E: `admin-wave8-smoke` (Action Center above Operations), `admin-wave16-smoke` (Save&Next + unsaved on next link).

### Deferred / ops

- Import workflow polish: existing import panel kept (no rewrite).
- Gallery color matrix already present — no new library.
- Phase 4 polish only after deploy Visual QA.

---

## 20. Phase 3 Findings — Admin operator workspace (2026-08-12)

### Dashboard (UX-012)

- `AdminActionCenter` renders **first** after page header; Operations/Sales KPI grids are secondary.
- Action rows show explicit CTA **«Обработать →»**.

### Editor (UX-019 / readiness / ERP)

- Save intents: `stay` | `close` | **`next`** (`Сохранить и далее`) → redirect to next queue item preserving `from`.
- Next-item link uses unsaved guard (`data-unsaved` + confirm).
- ERP price block collapsed in `<details>` (secondary).
- Readiness: open-item count badge, checklist/blocker deep-links to `#section-basics` / `#section-gallery`.

### Variants (compact table)

- MoySklad products: compact row table (цвет / размер / SKU / остаток / фото цвета / порядок·default).
- Full ERP fields under per-row disclosure.

### Tests

- `npx tsc --noEmit` clean
- E2E: `admin-wave8-smoke` (Action Center above Операции); `admin-wave16-smoke` (Save&Next + unsaved on next)

### Deferred / ops

- Import workflow polish (minor) — existing import panel unchanged
- Gallery color matrix already present — no rewrite
- Visual QA on prod after deploy

---

## 20. Phase 3 Findings — Admin operator workspace (2026-08-12)

### Dashboard (UX-012)

- `AdminActionCenter` renders **before** Operations / Sales KPI grids.
- Action rows show clear **«Обработать →»** CTA beside counts.

### Editor (UX-019 + readiness / ERP)

- Sticky actions: Save / Save&Close / **«Сохранить и далее»** (`intent=next` → next product in `from` queue).
- `AdminNextItemNavigation` uses unsaved guard (`confirmLeave` + `data-unsaved`).
- ERP price block collapsed by default (`<details>`).
- Readiness: problem count badge, checklist/blocker deep-links to `#section-basics` / `#section-gallery`.

### Variants (compact table)

- MoySklad products: compact row table (color, size, SKU, stock, photo coverage, sort/default).
- Full ERP fields under expandable «ERP и остатки».
- Manual products keep prior card editor + create form.

### Gallery

- Existing color matrix / `option_color` tagging retained (no rewrite).

### Tests

- `npx tsc --noEmit` clean
- E2E: `admin-wave8-smoke` (Action Center above Operations); `admin-wave16-smoke` (Save&Next + next-link unsaved guard)

---

## 21. Phase 4 Findings — Polish (2026-08-12)

### Loading / error shells

- Root, catalog, PDP loading use shared `StoreProductGridSkeleton` / PDP skeleton; denser homepage rhythm.
- Storefront `app/error.tsx` + admin `(panel)/error.tsx` with retry CTAs.
- Admin panel loading shows Action-Center-like skeleton blocks.

### Focus / empty

- Focus-visible rings on `StoreEmptyState`, `StoreErrorState`, `AdminEmptyState` actions.
- Admin empty CTAs use min-h-11 for touch.

### Gallery color context (UX-016)

- Matrix color / preview / «Показать» sets upload color + focus filter; gallery rows dim non-matching colors; clear filter control.

### Import (UX-013 minor)

- Import panel copy: queue path категория → Изменить → галерея → «Сохранить и далее».

### Docs (UX-026)

- Corrective UX Phases 0–4 closed in this audit + PM. Prior UX V2 “complete” remains stale for IA history only.

### Still out of scope / ops

- Favorites ♡ (no backend) — deferred
- Wrong sneakers media on prod — ops
- YooKassa — ADR-004 parallel track
- Production Visual QA after deploy
