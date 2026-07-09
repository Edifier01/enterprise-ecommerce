# ADR-003: Stripe Checkout, Payments, and Order Creation

## Status

Superseded for final payment provider by ADR-004. Retained as Sprint 9 checkout
foundation history.

## Date

2026-07-09

## Context

Sprint 9 added checkout and Stripe payments to the storefront. The platform
already has catalog products, variants, authentication, and placeholder cart UI,
but no persisted cart, checkout session, payment record, or order model.

> 2026-07-09 update: Stripe is no longer the target final payment provider.
> ADR-004 selects YooKassa for final payment integration and moves payment
> provider validation to the final project release gate. The checkout lifecycle
> invariants in this ADR still apply unless superseded by ADR-004.

The checkout implementation must preserve PCI SAQ A scope, avoid trusting client
prices, and prevent duplicate charges or duplicate orders under retries,
browser refreshes, and Stripe webhook redelivery.

## Decision Drivers

- Keep card data out of our systems.
- Create orders only from a trustworthy payment confirmation source.
- Support guest purchase flow while allowing authenticated carts.
- Preserve immutable commercial snapshots for order history.
- Keep Sprint 9 scoped: payment/order foundation first, inventory reservations
  as a later bounded-context extension.

## Decision

### Stripe Integration

Use Stripe PaymentIntents with Stripe Payment Element. The backend creates the
PaymentIntent and returns only the `client_secret`; the frontend uses Stripe.js
and Payment Element to collect payment details. The application does not use
custom card fields and does not store PAN, CVV, or raw Stripe payloads.

### Cart Strategy

Support both guest and authenticated carts:

- Guest carts are identified by an opaque `cart_session_id` cookie.
- Authenticated carts are associated with `user_id`.
- One active cart exists per owner.
- When a guest logs in, the guest cart is merged into the user's active cart
  idempotently. Matching variant lines are combined, and checkout still
  revalidates catalog prices server-side.

### Checkout and Order Lifecycle

`Cart` and `CheckoutSession` exist before payment. `PaymentRecord` is created
when the PaymentIntent is created. `Order` is created only after a verified
Stripe webhook for `payment_intent.succeeded`.

The frontend return/success page is not a source of truth. It may show a pending
confirmation state until the webhook has created the order.

### Idempotency

Use explicit idempotency boundaries:

- Cart line upsert: one line per variant per cart.
- Checkout session creation: `Idempotency-Key` header plus active cart state.
- PaymentIntent creation: `Idempotency-Key` header and unique
  `payment_records.idempotency_key`.
- Webhook handling: unique Stripe event IDs.
- Order creation: unique order per checkout session.

### Inventory Scope

Sprint 9 does not implement inventory reservation or stock deduction. The
catalog currently exposes `in_stock` only, with no quantity or reservation model.
Sprint 9 validates purchasability from current catalog state and records order
line snapshots. A later inventory sprint will add reservation, deduction, and
contention handling.

## Considered Options

### Option 1: Stripe PaymentIntent + Payment Element

- Pros: SAQ A compatible, flexible checkout UX, supports SCA and redirects,
  aligns with existing project payment rules.
- Cons: Requires our backend to model checkout/payment/order state carefully.

### Option 2: Stripe-hosted Checkout Session

- Pros: Lowest implementation surface and PCI burden.
- Cons: Less control over the custom checkout flow and weaker fit for the
  project's internal `CheckoutSession` aggregate and future cart/order rules.

### Option 3: Create Order Before Payment

- Pros: Simpler order reference before payment.
- Cons: Creates unpaid commercial records and requires complex cleanup. Rejected
  because project rules require order creation after payment confirmation.

### Option 4: Include Inventory Reservation in Sprint 9

- Pros: Stronger oversell protection.
- Cons: Requires a quantity model, reservation TTLs, and inventory state
  transitions that do not exist yet. Rejected for Sprint 9 scope.

## Consequences

### Positive

- Maintains PCI SAQ A scope by keeping card data in Stripe-hosted elements.
- Prevents frontend success redirects from creating orders without webhook proof.
- Makes retries and webhook redelivery safe through unique idempotency records.
- Establishes cart, checkout, payment, and order foundations for future
  inventory, refunds, admin order management, and fulfillment.

### Negative

- Orders may briefly appear pending after frontend redirect while waiting for
  webhook processing.
- Sprint 9 does not prevent all oversell scenarios because inventory reservation
  is deferred.
- More persistence tables are introduced before the full fulfillment domain
  exists.

## Implementation Notes

- Backend modules should follow feature-first DDD structure under
  `apps/api/app/features/checkout/`.
- `PaymentRecord` stores Stripe IDs, amount, currency, status, idempotency key,
  and safe payment method summary only.
- Webhook processing must verify `Stripe-Signature` against the raw request body
  before parsing or mutating state.
- Do not log full webhook payloads or `client_secret` values.
- Add a follow-up inventory ADR/sprint before implementing reservation or stock
  deduction.

## Related Decisions

- ADR-001: Monorepo Structure
- ADR-002: Product Variants and Pricing
- ADR-004: YooKassa as Final Payment Integration

