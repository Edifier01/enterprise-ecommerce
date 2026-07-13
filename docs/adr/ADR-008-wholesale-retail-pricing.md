# ADR-008: Wholesale and Retail Pricing with Wholesaler Customer Status

**Status:** Accepted  
**Date:** 2026-07-10

## Context

The storefront sells through purchasable **variants (SKUs)**. Today each variant has
a single `price_cents`; checkout, cart, and orders already resolve price at the
variant level (`cart_service.py` uses `variant.price_cents`).

Business requires **two commercial prices** per SKU:

- **Retail** — visible to all customers; used for purchase by default.
- **Wholesale** — lower price; visible and applicable only to customers with a
  permanent **wholesaler** status assigned by an admin.

Requirements agreed with product:

| Rule | Decision |
|------|----------|
| Wholesaler sees both prices | Yes |
| Wholesaler status duration | Permanent until admin revokes |
| Price storage level | **Variant (SKU)** — recommended and adopted |
| Minimum wholesale quantity | No |
| Existing orders when status changes | Unchanged (immutable snapshots) |

`compare_at_price_cents` on products remains **promotional “was” pricing**, not
wholesale. Wholesale is a separate field and authorization rule.

## Decision

### 1. Variant-level dual pricing

- Keep existing `product_variants.price_cents` as **retail price** (no rename in
  schema v1 — document as retail authority).
- Add `wholesale_price_cents` (NOT NULL after backfill) on `product_variants`.
- DB invariant: `wholesale_price_cents >= 0` and
  `wholesale_price_cents <= price_cents` (wholesale never above retail).
- Product-level `price_cents` may remain for list-card display (“from …”) but
  **checkout authority stays on the selected variant**.

### 2. Wholesaler status on customer users

- Add `is_wholesaler: bool` (default `false`) to customer `users` table.
- Only **admin** may set or clear this flag (RBAC permission e.g. `customers:write`).
- Status is **persistent**; no expiry or minimum-order rules in Sprint E.
- Removing wholesaler status affects **future** catalog/cart/checkout pricing only;
  existing `order_lines.unit_price_cents` are never recalculated.

### 3. Server-side price resolution (PricingContext)

Introduce a single catalog/checkout rule — **never trust the client for price tier**:

```
effective_price_cents(variant, buyer) =
  variant.wholesale_price_cents  if buyer.is_wholesaler
  else variant.price_cents
```

Apply in:

- Cart add/update and checkout revalidation
- Checkout session / payment intent amount calculation
- Order line snapshot at order creation

Record in order snapshot which tier was used (e.g. `price_tier: retail | wholesale`
on line snapshot JSON or dedicated column) for audit.

### 4. API visibility rules

| Consumer | Retail price | Wholesale price |
|----------|--------------|-----------------|
| Anonymous / retail customer | Yes | **No** — field omitted from JSON |
| Wholesaler customer | Yes | Yes |
| Admin catalog API | Yes | Yes (read/write) |

Public catalog, search, and product detail endpoints must **strip** wholesale
fields unless the authenticated customer is a wholesaler. Admin and internal
checkout paths use full data.

### 5. Storefront UX

- **Retail user:** single retail price everywhere (catalog, PDP, cart, checkout).
- **Wholesaler:** show both prices (e.g. “Розница: X / Опт: Y”); cart and checkout
  use wholesale; retail price remains visible for comparison.
- Wholesaler badge on account/profile when `is_wholesaler=true`.

### 6. Admin UX (Sprint E scope)

- Catalog admin: edit `wholesale_price_cents` per variant (alongside retail).
- New admin customers section (minimal): list customers, toggle wholesaler status.
- Dashboard unchanged unless low-effort wholesaler count metric is added later.

### 7. Sprint placement

Implemented as **Sprint E — Wholesale Pricing**, after Sprint D (orders admin)
and **before** the Final YooKassa gate. Checkout must price correctly before
production payment migration.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| Dual price only on `products` | Checkout already prices by variant; inconsistent for sized SKUs |
| Wholesale as percentage discount | Less explicit for ops; harder to audit per SKU |
| Wholesaler role on JWT/custom claim only | No persistent DB flag; admin cannot manage without user record |
| Expose wholesale to all users (grey price) | Violates requirement — retail users must not see wholesale |
| Recalculate open carts/orders on status change | Violates requirement — only new purchases affected |

## Consequences

**Positive:**

- Clear B2B/B2C price separation with admin control.
- Aligns with existing variant-first checkout and order snapshot model.
- Wholesale hidden from public API responses by default (defense in depth).

**Negative:**

- Catalog schemas, admin forms, cart, checkout, and OpenAPI all need coordinated
  updates.
- Requires customer admin UI (new surface area beyond catalog/orders admin).
- Seed and E2E must cover both personas (retail vs wholesaler).

## Related

- ADR-002 — variants as unit of sale; `compare_at` is promotional only
- ADR-003 / ADR-005 — cart and order line `unit_price_cents` snapshots
- ADR-007 — admin RBAC for customer status management
- `ecommerce/01-catalog`, `ecommerce/02-checkout`, `ecommerce/04-orders`
- Sprint E tasks: `.cursor/project-management/TASKS.md`
