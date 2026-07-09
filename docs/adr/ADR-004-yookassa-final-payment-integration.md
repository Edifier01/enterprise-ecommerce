# ADR-004: YooKassa as Final Payment Integration

## Status

Accepted

## Date

2026-07-09

## Context

Sprint 9 produced a checkout foundation with persisted carts, checkout sessions,
payment records, webhook idempotency, and order creation after trusted payment
confirmation. The implementation used Stripe as the first payment provider, but
the project target has changed: adding and validating the production payment
system is no longer part of the current Sprint 9 release validation. It is now
the final integration and release gate for the application.

The final payment provider must fit the target market and must preserve the
same architectural invariants already established for checkout:

- keep cardholder data out of application systems;
- never trust client-side prices;
- create orders only after verified payment-provider confirmation;
- make retries, redirects, and webhook redelivery idempotent;
- keep payment-provider code behind infrastructure adapters.

## Decision Drivers

- YooKassa is the intended final payment provider for the storefront.
- Payment-provider validation should happen after the remaining commerce
  foundation is complete, not as a current Sprint 9 blocker.
- Existing checkout domain concepts should remain provider-neutral where
  possible: cart, checkout session, payment record, webhook event, order.
- The final release gate must include a real YooKassa test-mode payment smoke
  from browser checkout through provider notification to order confirmation.

## Decision

Use **YooKassa** as the final payment provider for the project.

Stripe remains historical Sprint 9 foundation/prototype work. It is not the
target final payment provider and should not block current progress. The final
payment milestone will replace or refactor Stripe-specific adapters, frontend
payment UI, configuration, CSP, webhook naming, and tests around a YooKassa
integration.

The final payment integration must keep the existing order lifecycle invariant:

`Cart` and `CheckoutSession` may exist before payment, but `Order` is created
only after a verified YooKassa payment notification confirms successful payment.

Payment system implementation and full payment smoke are the final part of the
project before release readiness.

## Considered Options

### Option 1: Continue Stripe as Final Provider

- Pros: Current prototype code exists; Payment Element flow is already wired.
- Cons: No longer matches the target provider decision; continuing validation
  would spend time on a provider that will be replaced.

### Option 2: Replace Stripe with YooKassa Now

- Pros: Removes provider mismatch immediately.
- Cons: Interrupts the current roadmap with another high-stakes payment
  integration before the rest of the application is ready for final release.

### Option 3: Defer Final Payment Integration to Project End

- Pros: Keeps current progress unblocked; lets the team finish remaining
  commerce foundations first; turns YooKassa validation into a focused final
  release gate.
- Cons: Stripe-specific code remains temporarily and must be deliberately
  migrated later.

## Consequences

### Positive

- Current work is unblocked: missing Stripe publishable keys and Stripe webhook
  forwarding are no longer release blockers.
- The final payment system aligns with the target provider: YooKassa.
- Checkout architecture remains stable because the core domain model can be
  reused while replacing provider-specific infrastructure.

### Negative

- Some current code, docs, configuration names, tests, and frontend dependencies
  remain Stripe-specific until the final payment sprint.
- The final payment sprint must include provider migration work, not just a
  small configuration change.
- Existing payment smoke results cannot be treated as final production-payment
  validation.

## Implementation Notes

- Add a final project milestone for YooKassa integration and validation.
- Keep Sprint 9 marked as checkout foundation complete, not final payment
  provider complete.
- Do not add Stripe test keys or configure Stripe webhook forwarding as part of
  current validation.
- The final YooKassa sprint should review provider-specific naming across:
  backend gateway, webhook router, settings, frontend checkout UI, CSP/security
  headers, OpenAPI paths/schemas, package dependencies, tests, and docs.
- YooKassa notifications must be verified before mutating payment/order state.
- Do not log full provider payloads, secrets, confirmation tokens, card data, or
  equivalent sensitive payment details.

## Related Decisions

- ADR-001: Monorepo Structure
- ADR-003: Stripe Checkout, Payments, and Order Creation
