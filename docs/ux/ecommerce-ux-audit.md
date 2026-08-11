# ECOMMERCE UX V2 Audit — Phase 0

**Date:** 2026-08-11  
**Status:** VERIFIER APPROVED WITH NOTES (2026-08-11)  
**Scope:** Storefront + admin/storefront merchandising flow vs ECOMMERCE UX V2 TZ  
**Mode:** Repository audit and documentation only — no application code changed

---

## Executive Verdict

The project is not a greenfield UX rewrite. Storefront, admin, MoySklad integration, variants, gallery fallback, filters, cart, checkout stub, RBAC, and admin workflow foundations already exist.

The main UX V2 work should start from **storefront friction and cross-surface merchandising**, not from rebuilding admin or adding new features. The strongest current foundations are:

- Product/catalog data model supports merchandising overlay: `name`, `slug`, `description`, SEO, `image_url`, gallery `images`, `option_color`, `status`, category.
- MoySklad ownership is explicit in ADR-010 and backend guards.
- PDP already supports structured variants and color-tagged gallery through ADR-011.
- Admin UX Phase 0 already exists in `docs/ux/admin-ux-audit.md` and should be reused.
- Mobile Wave 5 already addressed several P0/P1 overlap issues from Wave 4; ecommerce-wide UX V2 should not reopen them as new findings.

Top Phase 1 candidates:

1. Storefront information architecture and real business content: contacts, delivery/returns pages, footer/topbar links.
2. Checkout/payments language and provider mismatch: UI is still Stripe/stub while ADR-004 requires YooKassa final provider.
3. Cart and checkout UX: missing line images, `USD` fallback, provider copy, validation messaging, mobile review.
4. Product page content architecture: no real delivery/trust block, fake fallback description, no structured characteristics block.
5. Search UX: no suggestions/autocomplete and no category suggestion path.
6. Admin-to-storefront preview: edit page can only link to active product, so unpublished merchandising changes cannot be previewed as specified.

---

## Sources

- Storefront code: `apps/web/src/app/**`, `apps/web/src/components/store/**`, `apps/web/src/lib/store/**`
- Admin code: `apps/web/src/app/admin/**`, `apps/web/src/components/admin/**`, `apps/web/src/lib/admin/**`
- Backend code: `apps/api/app/features/catalog/**`, `checkout/**`, `inventory/**`, `integrations/moysklad/**`
- Existing admin audit: `docs/ux/admin-ux-audit.md`
- Mobile audits: `docs/reviews/MOBILE-UX-AUDIT-WAVE4-2026-08-08.md`, `docs/reviews/MOBILE-UX-CODE-AUDIT-WAVE4-2026-08-08.md`, `docs/reviews/MOBILE-UX-WAVE4-SYNTHESIS-2026-08-08.md`
- Verification rules: `.cursor/VERIFICATION.md`
- Tooling: `apps/web/package.json`, `.github/workflows/ci.yml`, `apps/web/playwright.config.ts`

---

## Current Inventory

### Storefront Routes

- `/` — `apps/web/src/app/page.tsx`
- `/catalog` — `apps/web/src/app/catalog/page.tsx`
- `/catalog/[slug]` — `apps/web/src/app/catalog/[slug]/page.tsx`
- `/products/[slug]` — `apps/web/src/app/products/[slug]/page.tsx`
- `/search` — `apps/web/src/app/search/page.tsx`
- `/cart` — `apps/web/src/app/cart/page.tsx`
- `/checkout` — `apps/web/src/app/checkout/page.tsx`
- `/checkout/confirmation` — `apps/web/src/app/checkout/confirmation/page.tsx`
- `/account`, `/account/orders`, `/account/orders/[orderNumber]`
- Auth routes: `/login`, `/register`, `/register/wholesale`, `/forgot-password`, `/reset-password`, `/verify-email`
- `/offline`

Dedicated informational routes for delivery, payment, returns, contacts, or about pages were not found.

### Storefront Components

- Header/chrome: `store-header.tsx`, `main-header.tsx`, `top-bar.tsx`, `trust-bar.tsx`, `category-mega-menu.tsx`, `mobile-category-drawer.tsx`, `mobile-bottom-nav.tsx`, `site-footer.tsx`
- Catalog: `product-grid.tsx`, `product-card.tsx`, `filtered-product-list.tsx`, `catalog-filters-panel.tsx`, `sort-toolbar.tsx`, `catalog-pagination.tsx`, `catalog-search-form.tsx`
- PDP: `product-detail.tsx`, `product-gallery.tsx`, `variant-selector.tsx`, `product-purchase-panel.tsx`, `product-sticky-bar.tsx`, `related-products.tsx`
- Cart/checkout: `cart-client.tsx`, `checkout-payment-client.tsx`, `checkout-shipping-form.tsx`, `checkout-stripe-payment-form.tsx`, `confirmation-client.tsx`

### Design System Inventory

The storefront and admin already share a single Tailwind/shadcn foundation:

- Storefront and semantic tokens live in `apps/web/src/app/globals.css`: tactical olive primary, warm amber CTA, off-white background, card/border/status tokens, radii, mobile nav/CTA spacing.
- Storefront copy/layout config lives in `apps/web/src/lib/store/site-config.ts`: brand, contacts, trust bar, footer, grid classes, fallback categories, homepage promos.
- shadcn primitives exist under `apps/web/src/components/ui/`, including `button.tsx`, `card.tsx`, and `badge.tsx`.
- Admin primitives exist under `apps/web/src/components/admin/`: `AdminPageHeader`, `AdminFormSection`, `AdminDataTable`, `AdminEmptyState`, `AdminErrorState`, `AdminSavedViews`, `AdminFilterChips`, `AdminKpiCard`, `AdminPagination`, `AdminConfirmDialog`.
- Admin field styling is centralized in `apps/web/src/lib/admin/form-styles.ts`, while some edit fields still define local classes in `admin-product-edit-form.tsx`.

UX V2 should extend this system. It should not introduce a parallel component library or random colors/spacing in JSX.

### Home Inventory

The homepage at `apps/web/src/app/page.tsx` currently:

- Fetches three API-backed product sections: recommendations/popular, new/default, sale.
- Renders them via `SectionTabs`.
- Renders `SeoContentBlock`.
- Does not mount `homepagePromos` or a hero block.

This matches the TZ principle that a hero is optional unless current content/data supports it. Any future hero must use real approved content, not placeholder marketing copy.

### Account And Auth Inventory

Customer account/auth routes exist but are intentionally minimal:

- `/account` profile entry.
- `/account/orders` and `/account/orders/[orderNumber]` order history/detail.
- `/login`, `/register`, `/register/wholesale`, password reset, verify email.
- Storefront auth UI and registration are currently feature-flagged via `STOREFRONT_AUTH_UI_ENABLED` and `AUTH_REGISTRATION_ENABLED` according to PM state.

UX V2 should avoid expanding account features beyond profile/orders/cart/logout unless backend support and business priority are confirmed.

### Existing Visual Evidence

Untracked evidence files already exist and should be referenced during Phase 1/visual QA instead of repeated blindly:

- Mobile storefront/admin screenshots: `mobile-audit-homepage.png`, `mobile-audit-catalog.png`, `mobile-audit-category.png`, `mobile-audit-pdp-top.png`, `mobile-audit-pdp-sticky-overlap.png`, `mobile-audit-cart-empty.png`, `mobile-audit-cart-filled.png`, `mobile-audit-checkout.png`, `mobile-audit-checkout-blank.png`, `mobile-audit-filters-open.png`, `mobile-audit-login.png`, `mobile-audit-admin-login.png`.
- Admin screenshots: `prod-admin-dashboard-desktop.png`, `prod-admin-catalog-desktop.png`, `prod-admin-import-desktop.png`, `prod-admin-inventory-desktop.png`, `prod-admin-product-edit-desktop.png`, `prod-admin-product-edit-mobile.png`, `prod-admin-login-desktop.png`, `prod-admin-login-mobile.png`, `phase0-admin-login-prod-smoke.png`.
- Storefront screenshots: `prod-homepage-check.png`, `prod-homepage-product-card.png`.

### Admin Cross-Surface Inventory

Admin is already covered in `docs/ux/admin-ux-audit.md`. For ecommerce-wide UX V2, reuse these existing admin findings instead of duplicating them:

- Readiness panel absent on edit.
- Proactive publish blockers absent on edit.
- Next-product navigation absent.
- Unsaved-changes guard absent.
- Workflow board is navigation-first rather than action-first.
- Unified MoySklad locked-field pattern absent.

Key files:

- `apps/web/src/components/admin/catalog/admin-product-edit-form.tsx`
- `apps/web/src/components/admin/catalog/admin-workflow-board.tsx`
- `apps/web/src/components/admin/catalog/admin-product-gallery.tsx`
- `apps/web/src/lib/admin/merchandising-readiness.ts`
- `apps/api/app/features/catalog/domain/merchandising_readiness.py`

### API And Data Model

Public API support:

- `GET /api/v1/products`
- `GET /api/v1/products/facets`
- `GET /api/v1/products/search`
- `GET /api/v1/products/{slug}`
- `GET /api/v1/products/{slug}/erp-image`
- `GET /api/v1/categories`
- Cart and checkout under `/api/v1/cart` and `/api/v1/checkout/sessions`
- Orders under `/api/v1/orders`

Product public schema exposes:

- `name`, `slug`, `price_cents`, `compare_at_price_cents`, `currency`, `in_stock`
- `category_id`, `description`, `image_url`, SEO fields
- `option_groups`, `images`, `variants`

Cart schema exposes line snapshots but no stable product image field:

- `variant_id`, `quantity`, unit and total price
- `product_snapshot` with product/variant name, SKU, attributes

Known API gaps are listed below.

---

## Dedupe Register

Do not create new work items for the following unless Phase 1 explicitly changes scope:

- Admin Phase 0 findings from `docs/ux/admin-ux-audit.md` are authoritative for admin-only UX.
- Mobile Wave 4 P0/P1 findings have already been partly handled by Mobile Wave 5 according to PM state. In particular, `MOB-001`, `MOB-002`/`RISK-001`, `RISK-002`, `MOB-003`/`MOB-005..011`, `MOB-004`/`RISK-012`, and `RISK-003..004` should be verified as Wave 5 outcomes or tracked as residual Wave 6/mobile QA, not rediscovered as new ecommerce-wide findings.
- Mobile Wave 6 backlog items such as compact header (`MOB-012`/`RISK-015`), auth-route bottom nav (`MOB-013`), viewport-fit, keyboard, and sticky CTA accessibility overlap with EUX-007 and EUX-014 and must be reconciled in Phase 1.
- stich.su parity work already shipped gallery zoom/lightbox, mini-cart, and checkout shipping validation. UX V2 can refine those surfaces but should not frame them as absent.
- Wishlist, reviews, ratings, coupons, loyalty, comparison, and AI recommendations are out of scope unless backend support is explicitly added.

### Mobile Dedupe Crosswalk

| ECOMMERCE finding | Related mobile finding | Disposition for Phase 1 |
|---|---|---|
| EUX-001 checkout/payment | `MOB-001` checkout blank, checkout form UX blocker | Treat Wave 5 CSP fix as prerequisite; keep YooKassa/provider mismatch in checkout architecture track |
| EUX-003 cart UX | `MOB-003/005..011` touch targets, cart mobile evidence | Verify Wave 5 touch-target fixes; cart image/SKU/currency remains ecommerce UX work |
| EUX-007 header/mobile shell | `MOB-012`/`RISK-015` compact header, `MOB-013` auth-route bottom nav | Reconcile with Wave 6 backlog; do not create separate duplicate mobile epic |
| EUX-008 product cards | Mobile PLP screenshots and card touch-target findings | Validate image ratio/card density as catalog UX work; avoid reopening completed touch-target-only fixes |
| EUX-010 PDP variants/sticky | `MOB-002`/`RISK-001` PDP sticky overlap, variant touch targets | Verify Wave 5 sticky/padding fix; selected-variant summary remains PDP UX work |
| EUX-014 visual QA | `RISK-020`, required viewport matrix | Convert to Phase 14 QA matrix; do not rerun full mobile audit in Phase 1 |

---

## API Gap Matrix

| UX Need | Existing Support | Gap | Backend Change Required |
|---|---|---|---|
| Search suggestions with products + categories | `/products/search`, `/categories` | No suggestion endpoint or debounced UI | Likely yes for production-grade endpoint; possible FE prototype with existing APIs |
| SKU search | `/products/search` searches product name or SKU | Header UX does not expose suggestions | No for full results, likely yes for suggestions |
| Category filters | `/products/facets` | Supported for size/color/price/stock/sale | No |
| Variant availability | Variant has `in_stock` boolean | No public available quantity or "low stock" state | Yes if showing exact/low quantity |
| Product gallery | Public product detail has `images` | List/search omit images except resolved thumbnail path | No for current cards; yes if card needs multi-image/color gallery |
| Cart line image | Cart snapshot has no image | Cart cannot render stable product photo without extra fetch or snapshot extension | Yes preferred |
| Draft storefront preview | Public detail filters active only | Admin cannot preview unpublished merchandising state | Yes |
| Dedicated cart validation endpoint | Cart GET/update and checkout validate | No explicit pre-check endpoint | Optional; existing checkout path may be enough |
| YooKassa checkout | None | Stripe/stub remains final payment mismatch | Yes |

---

## Findings

Severity: **P0** = production/blocking risk, **P1** = high-friction primary journey, **P2** = consistency/polish, **P3** = backlog.

### EUX-001 — Checkout UI still references Stripe/stub instead of final YooKassa path

- **Route:** `/checkout`, `/checkout/confirmation`
- **Component:** `checkout/page.tsx`, `checkout-payment-client.tsx`, `checkout-stripe-payment-form.tsx`, `confirmation-client.tsx`
- **Current behavior:** Checkout metadata and copy say Stripe Payment Element; code resolves payment mode to Stripe or stub.
- **Problem:** TZ and ADR-004 say YooKassa is final provider. Customer-facing copy and payment architecture are inconsistent with release target.
- **Severity:** P0 for release readiness, P1 for UX V2 sequencing
- **User impact:** Buyer sees provider language that may not match real production payment flow.
- **Recommended solution:** Keep UX V2 audit as a flag only. Route payment implementation through YooKassa release gate before checkout UI polish is considered done.
- **Backend change required:** yes
- **Affected files:** `apps/web/src/app/checkout/page.tsx`, `apps/web/src/components/store/checkout/*`, `apps/api/app/features/checkout/**`
- **Risk:** High, payments and order creation invariants
- **Priority:** 1

### EUX-002 — Storefront has placeholder contacts and missing informational IA

- **Route:** Header/footer links, future `/delivery`, `/returns`, `/contacts`, `/about`
- **Component:** `site-config.ts`, `top-bar.tsx`, `site-footer.tsx`
- **Current behavior:** `support@example.com`, `8 (800) 000-00-00`, and footer/topbar links point to `/`, `/catalog`, or placeholder destinations.
- **Problem:** TZ explicitly requires replacing test contacts and using factual business data. Delivery/returns/contact links currently do not lead to customer-help pages.
- **Severity:** P1
- **User impact:** Trust loss, dead-end navigation, misleading customer support.
- **Recommended solution:** Phase 1 must decide whether informational pages are static markdown/Next routes or admin-managed content. Phase 3/4 should wire only real approved content.
- **Backend change required:** no for static pages; yes only if admin-managed content is required
- **Affected files:** `apps/web/src/lib/store/site-config.ts`, `apps/web/src/components/store/layout/site-footer.tsx`, new static routes if approved
- **Risk:** Medium, content accuracy/legal
- **Priority:** 2

### EUX-003 — Cart line UX misses product image and exposes technical SKU

- **Route:** `/cart`
- **Component:** `cart-client.tsx`, checkout cart API schemas
- **Current behavior:** Cart renders name, variant name, SKU, price, quantity controls, subtotal. It does not render product image. Currency falls back to `USD`.
- **Problem:** TZ requires photo, selected variant, price, quantity, subtotal, delete. SKU is operational data and is not always buyer-facing.
- **Severity:** P1
- **User impact:** Buyer cannot visually confirm cart contents; technical SKU adds noise.
- **Recommended solution:** Extend cart line presentation with product image source and structured variant attributes. Hide SKU from retail cart unless intentionally exposed.
- **Backend change required:** yes for stable image in cart snapshot; no for rendering existing attributes
- **Affected files:** `apps/web/src/components/store/checkout/cart-client.tsx`, `apps/web/src/lib/checkout/api.ts`, `apps/api/app/features/checkout/presentation/schemas.py`
- **Risk:** Medium, cart/order snapshot compatibility
- **Priority:** 3

### EUX-004 — PDP fallback description creates fake marketing content

- **Route:** `/products/[slug]`
- **Component:** `product-detail.tsx`
- **Current behavior:** If `product.description` is empty, PDP renders generated tactical copy and uses configured support email.
- **Problem:** TZ forbids fake marketing content. With current placeholder email, empty descriptions produce misleading content.
- **Severity:** P1
- **User impact:** Customer may see non-factual product claims and test support address.
- **Recommended solution:** Render an honest empty state or omit description until admin provides content. In admin, readiness should flag missing description if business wants it as required.
- **Backend change required:** no
- **Affected files:** `apps/web/src/components/store/catalog/product-detail.tsx`, `apps/web/src/lib/store/site-config.ts`, admin readiness docs
- **Risk:** Low
- **Priority:** 4

### EUX-005 — Product information architecture is incomplete on PDP

- **Route:** `/products/[slug]`
- **Component:** `product-detail.tsx`, `product-purchase-panel.tsx`, `product-specs-table.tsx`
- **Current behavior:** PDP shows breadcrumbs, gallery, name, price, stock, variants, CTA, description. `ProductSpecsTable` exists but is not mounted. Delivery/trust block is absent.
- **Problem:** TZ requests description, characteristics, delivery, returns, consultation, and recommendations in a clear order using factual data.
- **Severity:** P1
- **User impact:** Buyer lacks decision-support information after choosing variant.
- **Recommended solution:** Phase 1 should define PDP content sections and factual source. Do not invent delivery/return terms. Reuse existing trust items only where they are accurate.
- **Backend change required:** no for static/factual blocks; yes if characteristics require new structured fields
- **Affected files:** `apps/web/src/components/store/catalog/product-detail.tsx`, `product-specs-table.tsx`, `site-config.ts`
- **Risk:** Medium, content/legal accuracy
- **Priority:** 5

### EUX-006 — Search is submit-only; no suggestions or category discovery

- **Route:** Header search, `/search`
- **Component:** `catalog-search-form.tsx`, `search/page.tsx`, public catalog API
- **Current behavior:** Header form submits to `/search?q=...`; empty submit routes to `/search`; no suggestions.
- **Problem:** TZ requests product and category suggestions, SKU support, and a fuller store search experience.
- **Severity:** P1
- **User impact:** Buyer has to leave the page to discover whether a query has matches.
- **Recommended solution:** Phase 1 should design suggestion UX and API contract. Reuse `/products/search` and `/categories` if acceptable; add a small suggestions endpoint only if needed.
- **Backend change required:** likely yes for production-grade suggestions
- **Affected files:** `apps/web/src/components/store/catalog/catalog-search-form.tsx`, `apps/web/src/lib/api.ts`, `apps/api/app/features/catalog/presentation/router.py`
- **Risk:** Medium, request volume/performance
- **Priority:** 6

### EUX-007 — Header/mobile shell does not match compact target

- **Route:** Global storefront shell
- **Component:** `store-header.tsx`, `main-header.tsx`, `mobile-category-drawer.tsx`, `mobile-bottom-nav.tsx`
- **Current behavior:** Desktop uses top bar + trust bar + sticky main/category rows. Mobile hides top/trust bars and renders logo/actions plus a full-width search row.
- **Problem:** TZ requests a compact desktop header and mobile row with menu/logo/search/cart. Current mobile search consumes vertical space and trust/contact behavior needs a deliberate mobile IA.
- **Severity:** P1
- **User impact:** Mobile users lose above-the-fold space and secondary links/trust are not intentionally placed.
- **Recommended solution:** Phase 1 should define mobile header variants, search entry behavior, and where trust/contact links live. Implementation should preserve existing category drawer and bottom nav rules.
- **Backend change required:** no
- **Affected files:** `apps/web/src/components/store/layout/store-header.tsx`, `main-header.tsx`, `mobile-category-drawer.tsx`, `mobile-layout.ts`
- **Risk:** Medium, mobile regression
- **Priority:** 7

### EUX-008 — Product card image ratio and stock states are below target

- **Route:** Home, catalog, category, search
- **Component:** `product-card.tsx`, `product-grid.tsx`
- **Current behavior:** Product image area is `aspect-square`; stock badge is binary `В наличии` / `Нет в наличии`; card supports color dots and sale price.
- **Problem:** TZ recommends 4:5 standard image ratio and non-color-only stock states including low stock where supported. Backend exposes only boolean public stock.
- **Severity:** P2
- **User impact:** Product grid feels less premium and gives limited availability nuance.
- **Recommended solution:** Audit real product photography before changing crop. If low-stock state is desired, expose a safe derived public state rather than exact ERP quantity.
- **Backend change required:** no for ratio; yes for low-stock state
- **Affected files:** `apps/web/src/components/store/catalog/product-card.tsx`, `apps/web/src/lib/store/product-grid.ts`, public product schema if low-stock added
- **Risk:** Medium, image crop quality
- **Priority:** 8

### EUX-009 — Static fallback categories and sublinks can look like real taxonomy

- **Route:** `/catalog`, `/catalog/[slug]`, header mega menu
- **Component:** `site-config.ts`, `categories.ts`, `category-mega-menu.tsx`
- **Current behavior:** API categories are used when available, but static category/sub-link fallbacks exist. Category pages always show a sync disclaimer.
- **Problem:** TZ says categories should come from existing DB and not be hardcoded. Fallbacks are useful for resilience but must not mislead production UX.
- **Severity:** P2
- **User impact:** Buyer may see stale or fake taxonomy when API is unavailable.
- **Recommended solution:** Phase 1 should set a policy: production should prefer an honest error/empty state over hardcoded merchandising taxonomy unless explicitly approved.
- **Backend change required:** no
- **Affected files:** `apps/web/src/lib/store/site-config.ts`, `apps/web/src/lib/store/categories.ts`, `apps/web/src/components/store/layout/category-mega-menu.tsx`, `apps/web/src/app/catalog/[slug]/page.tsx`
- **Risk:** Low to medium
- **Priority:** 9

### EUX-010 — Variant UX is strong but selected-state details are incomplete

- **Route:** `/products/[slug]`
- **Component:** `variant-selector.tsx`, `product-purchase-panel.tsx`
- **Current behavior:** Structured selector shows size pills/color swatches and disables/strikes unavailable values. Selected value appears in the fieldset legend. CTA requires selected variant.
- **Problem:** TZ asks selected variant details such as `Размер: 42`, availability, and optional remaining quantity. Current UI does not expose remaining quantity and selected detail is subtle.
- **Severity:** P2
- **User impact:** Buyer may not clearly understand the exact chosen variant before adding to cart.
- **Recommended solution:** Improve selected variant summary using existing attributes. Do not show quantity unless business approves and API exposes it safely.
- **Backend change required:** no for summary; yes for remaining quantity
- **Affected files:** `apps/web/src/components/store/catalog/product-purchase-panel.tsx`, `variant-selector.tsx`, public product schema if quantity added
- **Risk:** Low
- **Priority:** 10

### EUX-011 — Admin product preview only works after publication

- **Route:** `/admin/catalog/[id]/edit`
- **Component:** `admin-product-edit-form.tsx`
- **Current behavior:** Edit page links to `/products/{slug}` only when product is active and categorized; otherwise it says preview is available after publication.
- **Problem:** TZ asks for storefront preview that reflects name, photo, price, variants, description, and availability. Operators need preview before publishing.
- **Severity:** P1
- **User impact:** Operator publishes to see final presentation, increasing rework and risk.
- **Recommended solution:** Phase 1 should decide between secure draft preview route, signed preview token, or admin-only preview panel. Do not bypass storefront visibility rules casually.
- **Backend change required:** yes
- **Affected files:** `apps/web/src/components/admin/catalog/admin-product-edit-form.tsx`, `apps/web/src/app/products/[slug]/page.tsx`, public/admin catalog API
- **Risk:** High, visibility/RBAC/cache invalidation
- **Priority:** 11

### EUX-012 — Admin merchandising loop findings must be integrated, not duplicated

- **Route:** `/admin/catalog/workflow`, `/admin/catalog/[id]/edit`
- **Component:** `admin-workflow-board.tsx`, `admin-product-edit-form.tsx`, `admin-product-gallery.tsx`
- **Current behavior:** Existing admin audit already found readiness/edit, next-product, unsaved guard, workflow queue, and MoySklad lock-label gaps.
- **Problem:** ECOMMERCE UX V2 depends on these admin improvements because admin controls storefront perception. Duplicating them as separate tasks would fragment delivery.
- **Severity:** P1
- **User impact:** Operator cannot efficiently move products from import to polished storefront.
- **Recommended solution:** In Phase 1, import `docs/ux/admin-ux-audit.md` findings as the admin track and map them to the ecommerce-wide roadmap.
- **Backend change required:** no blocking admin API gaps found
- **Affected files:** `docs/ux/admin-ux-audit.md`, `apps/web/src/components/admin/**`
- **Risk:** Medium, planning drift
- **Priority:** 12

### EUX-013 — Storefront error/loading states are inconsistent and often text-only

- **Route:** Home, catalog/category, cart, checkout
- **Component:** `page.tsx`, `catalog/[slug]/page.tsx`, `cart-client.tsx`, `checkout-payment-client.tsx`
- **Current behavior:** Some failures render inline alert text; cart/checkout loading uses plain card text; product grid has skeleton in other paths.
- **Problem:** TZ calls for consistent skeletons, retryable errors, and non-technical user messages.
- **Severity:** P2
- **User impact:** Failures feel unfinished and may not offer next action.
- **Recommended solution:** Define reusable storefront `EmptyState`, `ErrorState`, and skeleton variants using existing shadcn primitives and store tokens.
- **Backend change required:** no
- **Affected files:** `apps/web/src/components/store/**`, route pages
- **Risk:** Low
- **Priority:** 13

### EUX-014 — Visual QA coverage exists but not for full UX V2 journey

- **Route:** Storefront and admin critical journeys
- **Component:** Playwright specs under `apps/web/e2e`
- **Current behavior:** 24 specs exist across storefront, checkout, admin, and mobile. Mobile project uses 390x844 only. CI runs typecheck/build/e2e.
- **Problem:** TZ requires visual QA across desktop 1280/1440/1920, tablet 768/1024, and mobile 375/390/430 plus specific product/photo/variant datasets.
- **Severity:** P2
- **User impact:** Layout regressions can pass current tests.
- **Recommended solution:** Phase 1 should define QA matrix; later phases add targeted Playwright projects or manual production smoke checklist without exploding CI time.
- **Backend change required:** no
- **Affected files:** `apps/web/playwright.config.ts`, `apps/web/e2e/*`, `docs/ux/ecommerce-ux-v2-architecture.md`
- **Risk:** Medium, CI runtime
- **Priority:** 14

---

## Phase Mapping Recommendation

- **Phase 1 Architecture:** EUX-001 through EUX-014 triage, storefront IA, admin audit import, preview strategy, design-system policy.
- **Phase 2 Design System:** EUX-013, status badges, card ratio policy, shared empty/error/loading states.
- **Phase 3 Storefront Shell:** EUX-002, EUX-006, EUX-007.
- **Phase 4 Home:** product presentation, optional hero only if real content exists.
- **Phase 5 Catalog:** EUX-008, EUX-009, filter/mobile QA.
- **Phase 6 Product Page:** EUX-004, EUX-005, EUX-010.
- **Phase 7 Cart/Checkout:** EUX-001, EUX-003.
- **Phase 8-13 Admin:** import admin audit findings, especially EUX-011/EUX-012.
- **Phase 14 Mobile:** validate Wave 5 fixes and full UX V2 viewports.
- **Phase 15 Accessibility/Performance:** focus, touch targets, image loading, Server Component boundaries.
- **Phase 16 Final Audit:** before/after comparison and journey verification.

---

## Verification Commands For Later Phases

Canonical commands discovered in repo/CI:

- Frontend: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npx playwright test` from `apps/web`
- Backend: `ruff check apps/api/app/ apps/api/tests/`, `alembic upgrade head`, `python scripts/export_openapi.py`, `pytest tests/ -q` from CI/API context
- Browser verification: use production URLs in `.cursor/VERIFICATION.md` unless explicitly testing local dev.

No tests were run for this docs-only Phase 0 audit.

