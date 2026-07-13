# ADR-008: Wholesale Pricing and Customer Tier

**Status:** Accepted  
**Date:** 2026-07-10

## Context

The storefront sells through purchasable SKUs (`product_variants`) with a single
`price_cents` used end-to-end in catalog display, cart, checkout, and orders
(ADR-002). Operations need a second commercial price tier — **wholesale** — visible
and applicable only to customers marked as **wholesalers** (`оптовик`).

Business rules agreed with product owner:

1. Each sellable SKU has **two prices**: retail and wholesale.
2. **Wholesalers** see **both** prices and purchase at wholesale.
3. **Regular customers** see and purchase at **retail only**; wholesale must not
   appear in UI or API payloads for them.
4. Wholesaler status is **permanent** until an admin revokes it (no expiry/MOQ).
5. **No minimum order quantity** for wholesale purchases.
6. **Existing orders are immutable** — revoking wholesaler status does not
   recalculate historical `order_lines`.

`compare_at_price_cents` remains a promotional “was” price and is unrelated to
wholesale pricing.

## Decision

### 1. Price authority at variant (SKU) level

- Keep existing `product_variants.price_cents` as **retail** (no rename in Sprint E
  migration to minimise churn; document as retail in domain/API).
- Add nullable `product_variants.wholesale_price_cents`.
- **Source of truth for checkout** is the variant row; product-level `price_cents`
  remains a display fallback only where variants are not loaded.
- Invariant (domain + DB CHECK):
  `wholesale_price_cents IS NULL OR wholesale_price_cents <= price_cents`.
- Admin must set wholesale when enabling two-tier sales for a SKU; storefront
  checkout rejects wholesale purchase if wholesale is null for a wholesaler (409 or
  treat as retail — implement as explicit 409 in Sprint E).

### 2. Customer tier on `users`, admin-controlled

- Add `users.is_wholesaler BOOLEAN NOT NULL DEFAULT false`.
- Only admin can grant/revoke via admin API (`PATCH /api/v1/admin/customers/{id}/wholesaler`
  or equivalent); customers cannot self-promote.
- Wholesaler badge shown on account UI when `is_wholesaler=true`.
- Deactivating wholesaler affects **future** catalog/cart/checkout pricing only.

### 3. Server-side price resolution (never trust client)

Introduce a catalog/checkout **price tier resolver** used everywhere money is
computed:

| Viewer / buyer | Catalog API exposes | Cart / checkout charges |
|----------------|--------------------|-------------------------|
| Anonymous / regular | `price_cents` (retail) only | retail |
| Wholesaler (authenticated) | `price_cents` + `wholesale_price_cents` | wholesale when set, else retail |

- Resolver input: `variant`, optional `User` (or `is_wholesaler` flag).
- Cart lines and order lines store resolved `unit_price_cents` + optional
  `price_tier` enum (`retail` | `wholesale`) in snapshot metadata for audit.
- Public and customer JWT catalog/search endpoints **omit** `wholesale_price_cents`
  unless the authenticated user is a wholesaler.

### 4. Admin surface (Sprint E scope)

- Catalog admin: edit `wholesale_price_cents` per variant (and product form where
  variants are managed).
- Customers admin (minimal): list customers, toggle `is_wholesaler`, show badge in
  list/detail.
- RBAC: `catalog:write` for prices; new permission `customers:write` for tier
  toggle (superadmin only in Sprint E).

### 5. API contract

- Customer `GET /api/v1/auth/me` includes `is_wholesaler: boolean`.
- Product/variant schemas gain `wholesale_price_cents` **conditionally** (wholesaler
  only).
- OpenAPI documents conditional fields in description; no separate public schema
  fork in Sprint E.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| Wholesale price on `products` only | Checkout already charges `variant.price_cents`; inconsistent for multi-variant products |
| Wholesaler role on `users.role` string | Less explicit; harder to RBAC/guard; boolean flag is sufficient |
| Separate `wholesaler_profiles` table | Over-engineering for a single permanent flag |
| Percentage discount instead of second price | Business asked for explicit opt/retail pair per SKU |
| Hide retail from wholesalers | Product owner requires both prices visible |

## Consequences

**Positive:**

- Clear B2B tier without duplicating catalog SKUs.
- Price authority stays server-side; PCI/checkout invariants preserved.
- Order history remains stable when tier changes.

**Negative:**

- Catalog, cart, checkout, admin catalog, and new admin customers module must all
  adopt the resolver — cross-cutting Sprint E.
- Conditional API fields require careful tests so wholesale never leaks to regular
  users.
- Seed data and admin forms must be updated for two prices per variant.

## Sprint E Delivery Map

| Track | Deliverables |
|-------|----------------|
| **E1 — Schema & domain** | Migration `010_wholesale_pricing`, domain invariants, `PriceTier` enum, resolver port |
| **E2 — Customer tier** | `users.is_wholesaler`, admin toggle API, `/auth/me` field |
| **E3 — Catalog & cart** | Conditional catalog responses, cart/checkout resolver integration, order snapshot `price_tier` |
| **E4 — Admin & storefront UI** | Admin variant wholesale field, customers list/toggle, PDP/catalog dual-price display, account badge |
| **E5 — Quality gate** | pytest (leak tests), Playwright wholesaler vs regular smoke, OpenAPI sync |

## Related

- ADR-002 — variants as unit of sale; `compare_at_price_cents` is promotional only
- ADR-003/005 — cart/checkout price revalidation and order line snapshots
- ADR-007 — admin RBAC namespace for customer tier management
- `ecommerce/01-catalog`, `ecommerce/02-checkout`
- `security/01-auth`
