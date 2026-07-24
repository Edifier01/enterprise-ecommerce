# stich.su ↔ СУХОПУТ UX Parity Gap Analysis

**Date:** 2026-07-24  
**Reference:** https://stich.su (OpenCart)  
**Target:** existing storefront (preserve design; no style redesign)  
**Verification storefront:** https://сухопут-кмв.рф

---

## Method

Browser analysis of public catalog/PDP plus authenticated cart/checkout/account flows on stich.su. Compared against current `apps/web` storefront modules and cart/checkout APIs.

---

## stich.su findings (Stage 1)

### Catalog & navigation

| Behavior | stich.su |
|----------|----------|
| Category depth | ~2 levels (e.g. Одежда → Тактические брюки); left sidebar lists siblings/children |
| Breadcrumbs | Home + category trail |
| Attribute filters | Not present on sampled clothing PLPs (navigation by subcategory) |
| Sort | `<select id="input-sort" onchange="location = this.value">` — **full page reload**, not AJAX |
| Limit | 25 / 50 / 75 / 100 via full navigation |
| Pagination | Classic page links when needed; sampled PLP fit on one page |
| PLP «Купить» | Links to PDP for multi-option products |

### Product card (PDP)

| Behavior | stich.su |
|----------|----------|
| Variants | Color/size pills (`data-opt-name` / `data-opt-val`) |
| Price / stock update | Client-side, **no page reload**; stock text updates per size (e.g. «НАЛИЧИЕ: 248 ШТ.»); no catalog XHR observed on size click |
| Gallery | Thumbnails + Swiper; Fancybox / Magnific Popup for lightbox/zoom |
| Add to cart | **AJAX** `POST …/checkout/cart/add`; header count/total updates without navigation |
| Blocks | Specs/attributes, description + reviews tabs; stock matrix modal |

### Cart

| Behavior | stich.su |
|----------|----------|
| Header | «ТОВАРОВ N (SUM Р.)» link to cart page |
| Mini-cart dropdown | Classic `#cart .dropdown-menu` **not observed** as primary UX; header summary + cart page |
| Cart page | Qty ±, remove, line/subtotal totals; **no promocode UI** on sampled cart |
| Free-shipping notices | Informational banners |

### Checkout

| Behavior | stich.su |
|----------|----------|
| Flow | **6-step accordion** (address → shipping → payment → confirm) |
| Loading | Step panels loaded via OpenCart AJAX routes |
| Payments | Site uses YooKassa partner module (out of scope for this parity sprint) |

### Account

| Behavior | stich.su |
|----------|----------|
| Wishlist | «Мои закладки» |
| Orders | Account order history routes |
| Bonus / subscribe | Present — **out of scope** |

### Technical

| Topic | stich.su |
|-------|----------|
| JSON-LD | Not observed on sampled PDP (`jsonldCount: 0`) |
| Empty / loading | Standard OpenCart empty wishlist/cart copy |

---

## Current СУХОПУТ status

| Area | Status | Module |
|------|--------|--------|
| Filters + facets (size/color/price/stock/sale) | ✅ URL-synced soft navigation (`useTransition` + `router.push`) — **already better than stich full reload** | `filtered-product-list.tsx`, `catalog-filters-panel.tsx` |
| Sort + pagination | ✅ | `sort-toolbar.tsx`, `catalog-pagination.tsx` |
| Category hierarchy + breadcrumbs | ✅ | catalog routes, `breadcrumbs.tsx` |
| Variant selector + dynamic price/stock badge | ✅ ADR-011 | `variant-selector.tsx`, `product-purchase-panel.tsx` |
| Gallery thumbs + color sync | ✅ | `product-detail.tsx` |
| Gallery zoom / lightbox | ❌ gap | — |
| Add to cart AJAX + toast | ✅ | `add-to-cart-button.tsx` |
| Header cart badge + total | ✅ (parity with stich header summary) | `cart-header-summary.tsx` |
| Mini-cart dropdown with lines | ❌ gap (user-requested; stich weak here too) | — |
| Cart page qty/remove/totals | ✅ | `cart-client.tsx` |
| Promocode | ❌ neither site shows it in sampled cart — out of scope | — |
| Checkout shipping form | ⚠️ HTML `required` only; Zod backlog | `checkout-shipping-form.tsx` |
| Order history + detail | ✅ | `/account/orders` |
| JSON-LD | ✅ exceeds stich | `product-json-ld.tsx` |
| MoySklad prices/stock/sizes | ✅ ADR-010 | backend + PDP |

---

## Gap priority (implement)

1. **P0 — PDP gallery zoom/lightbox** — click-to-enlarge + desktop loupe using existing layout/classes (no new design system).
2. **P0 — Mini-cart dropdown** — powered by existing `GET /api/v1/cart`; qty update/remove via existing PATCH/DELETE; reuse store CTA classes.
3. **P1 — Checkout shipping Zod validation** — client-side schema before `createCheckoutSession`; keep single-page checkout (do not copy OpenCart 6-step UI).
4. **P2 — Filter list polish** — keep URL soft navigation; ensure pending/empty states remain clear (no rewrite to OpenCart reload).
5. **P2 — Dead code cleanup** — remove unused cart/filter helpers only after new paths are verified.

## Explicit non-goals

- YooKassa / payment provider swap (ADR-004 release gate)
- Storefront redesign / CSS token changes
- Wishlist, bonuses, subscriptions, compare
- Promocode engine
- Showing raw warehouse quantity when API only exposes `in_stock` boolean (do not invent stock counts)

---

## ADR decision

**No new ADR required.** Interaction model stays within ADR-002 / ADR-003 / ADR-005 / ADR-010 / ADR-011:

- Catalog remains URL-synced server list + soft client navigation (not a new filter architecture).
- Mini-cart is a presentation layer over existing cart API.
- Gallery zoom is pure UI.
- Checkout validation is client schema on existing shipping DTO.

---

## EXTEND vs REPLACE

| EXTEND | REPLACE only if dead after ship |
|--------|----------------------------------|
| `product-detail.tsx` | obsolete placeholders under cart/filters if any |
| `cart-header-summary.tsx`, `use-cart-summary.ts` | duplicate unused filter helpers |
| `checkout-shipping-form.tsx`, `checkout-payment-client.tsx` | — |
| `filtered-product-list.tsx` (polish only) | — |
