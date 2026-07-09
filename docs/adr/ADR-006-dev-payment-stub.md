# ADR-006: Dev Payment Stub for Checkout

## Status

Accepted

## Date

2026-07-09

## Context

Sprint 9 delivered a checkout foundation with Stripe as the first payment adapter.
ADR-004 defers final YooKassa integration to the project release gate and states
that missing Stripe keys are not release blockers. In practice, local development
and browser smoke tests cannot complete the payment → order path without either
Stripe test keys or Stripe CLI webhook forwarding.

The backend test suite already validates the full checkout lifecycle using an
in-memory `FakeStripeGateway` injected via FastAPI dependency overrides. That
pattern proves the domain invariants work without a real provider, but the
runtime application and storefront still require Stripe configuration to proceed
past the payment step.

The team needs a **dev/test payment stub** that:

- completes checkout through order confirmation without external provider keys;
- preserves ADR-003 order lifecycle invariants (order only after verified webhook);
- preserves ADR-005 inventory reservation/deduction timing;
- does not replace or delay the final YooKassa integration (ADR-004).

## Decision Drivers

- Unblock local development and E2E smoke without Stripe or YooKassa credentials.
- Keep payment-provider code behind infrastructure adapters for future YooKassa migration.
- Avoid creating orders synchronously from the frontend or payment-intent endpoint.
- Hard-gate stub behaviour away from production.

## Decision

Introduce a **dev/test payment stub** behind the existing `IStripeGateway` port:

1. **`StubPaymentGateway`** — in-memory adapter that creates fake payment intent IDs
   and accepts unsigned webhook payloads in non-production contexts.
2. **`payment_provider` setting** — `auto` (default), `stub`, or `stripe`.
   - `auto` selects `stub` when `STRIPE_SECRET_KEY` is empty, otherwise `stripe`.
3. **Dev simulate endpoint** — `POST /api/v1/dev/payments/{payment_intent_id}/simulate-success`
   builds a `payment_intent.succeeded` event and routes it through `WebhookService`.
   - Returns HTTP 404 in `production`.
   - Returns HTTP 404 when `payment_provider` resolves to `stripe`.
4. **Frontend stub mode** — `NEXT_PUBLIC_PAYMENT_MODE=auto|stub|stripe`.
   - Stub mode shows a test payment button instead of Stripe Payment Element.
   - Calls the simulate endpoint, then redirects to the existing confirmation poll flow.

**Invariants preserved:**

- `Order` is created only via `WebhookService.handle_stripe_webhook` on
  `payment_intent.succeeded`.
- Inventory is deducted in the same transaction as order creation (ADR-005).
- No cardholder data enters application systems.

**Production guardrails:**

- `payment_provider=stub` raises a configuration error when `ENVIRONMENT=production`.
- The simulate endpoint returns 404 in production regardless of provider setting.

## Considered Options

### Option 1: Create Order Synchronously on Payment Intent

- Pros: Simplest frontend flow; no webhook simulation.
- Cons: Violates ADR-003; skips amount verification and idempotency boundaries in
  `WebhookService`; diverges from final YooKassa notification model.

### Option 2: Stripe Test Keys + CLI Webhooks

- Pros: Validates real Stripe adapter.
- Cons: Requires external tooling and credentials; validates a provider that will
  be replaced per ADR-004; poor developer onboarding experience.

### Option 3: Stub Gateway + Webhook Simulation (Chosen)

- Pros: Reuses existing webhook/order/inventory path; no provider keys; aligns with
  test patterns; minimal schema changes.
- Cons: Stripe-specific naming persists until YooKassa sprint; stub must be
  carefully gated from production.

## Consequences

### Positive

- Full cart → checkout → order confirmation works locally without provider setup.
- E2E and manual smoke can validate commerce flows before the YooKassa gate.
- Webhook, idempotency, and inventory logic remain exercised in dev.

### Negative

- Stub does not validate real provider signature verification or redirect flows.
- `stripe_*` column and route naming remains until ADR-004 final payment sprint.
- Developers must understand stub is not a substitute for final YooKassa smoke.

## Implementation Notes

- Reuse `IStripeGateway` port; rename to generic `IPaymentGateway` during YooKassa sprint.
- Default `payment_provider=auto` and `NEXT_PUBLIC_PAYMENT_MODE=auto` for zero-config dev.
- Document env vars in `.env.example`.
- Add pytest coverage for stub provider selection, simulate-success order creation,
  and production guard on simulate endpoint.

## Related Decisions

- ADR-003: Stripe Checkout, Payments, and Order Creation
- ADR-004: YooKassa as Final Payment Integration
- ADR-005: Inventory Reservation and Deduction for Checkout
