# ADR-002: Product Variants, Pricing Display, and Category Association

**Status:** Accepted
**Date:** 2026-07-08

## Context

The catalog currently models a `Product` as a single sellable unit with one
`price_cents` and a boolean `in_stock`. Sprint 8 introduces:

1. **Product variants** — purchasable SKUs with their own attributes (size,
   color) and price, per `ecommerce/01-catalog` (variant = smallest unit of sale).
2. **Sale pricing display** — a "was" price (`compare_at_price`) to show discounts.
3. **Product ↔ Category association** — to replace the deterministic
   `assignCategorySlug` frontend mock with real data.

`ecommerce/01-catalog` offers three multi-currency strategies and describes
category association as many-to-many with one primary category. We must record
which options we adopt now to avoid architectural drift, while keeping the change
minimal and targeted (`core/00-core`).

## Decision

### 1. Variants as a child entity of the Product aggregate

- Add a `product_variants` table owned by the catalog context.
- `ProductVariant` is loaded as part of the `Product` aggregate on the detail
  path (`get_by_slug`). It is not a separate aggregate root repository for now —
  variants are only accessed through their product.
- Every variant has `is_default`; single-variant products still get one default
  variant row for consistency (seeded going forward).
- Variant `attributes` stored as JSONB (`dict[str, str]`) for flexible
  size/color options without schema churn.

### 2. Pricing — single currency + compare-at

- Adopt **single-currency per deployment** (catalog rule Option 1). The existing
  `currency` column on `products` is retained; no per-currency price table.
- Add nullable `compare_at_price_cents` to `products`. Invariant enforced in both
  the domain entity and a DB CHECK constraint:
  `compare_at_price_cents IS NULL OR compare_at_price_cents > price_cents`.
- Price authority stays server-side; the frontend only displays.

### 3. Category association — primary category FK (M2M deferred)

- Add nullable `category_id` FK on `products` (→ `categories.id`, `ON DELETE SET
  NULL`) representing the product's **primary** category.
- Full many-to-many (`product_categories`) is **deferred** until secondary
  cross-navigation is required. A single primary FK satisfies current listing,
  filtering, breadcrumbs, and canonical-URL needs.
- Add optional `category` slug filter to `GET /api/v1/products` so the storefront
  category page filters by real data instead of `assignCategorySlug`.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| ProductVariant as independent aggregate + repository | Over-engineering; no order/cart flow consumes variants directly yet |
| Per-currency price table (Option 2) | No multi-currency requirement today; adds join complexity |
| Exchange-rate conversion (Option 3) | Retail deployment is single-currency; defer |
| Many-to-many product↔category now | Current UX needs only a primary category; M2M can be added later without breaking the FK |
| compare_at validation only in app layer | DB CHECK adds defense in depth against bad writes |

## Consequences

**Positive:**
- Storefront can show real variants and sale prices.
- Category filtering uses real associations; `assignCategorySlug` mock removed.
- Minimal schema footprint; migration is additive and reversible.

**Negative:**
- Products created before migration have `category_id = NULL` and no variants
  until seeded/backfilled (graceful: PDP falls back to base product price).
- Switching primary-FK → M2M later requires a follow-up migration + ADR.

## Related

- `ecommerce/01-catalog` — catalog domain standard
- `database/01-schema`, `database/02-migrations`
- `architecture/05-domain-modeling`
- ADR-001 monorepo structure
