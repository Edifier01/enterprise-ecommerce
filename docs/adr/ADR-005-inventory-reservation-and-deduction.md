# ADR-005: Inventory Reservation and Deduction for Checkout

## Status

Accepted

## Date

2026-07-09

## Context

Sprint 9 delivered the checkout foundation (cart, checkout session, payment
record, webhook idempotency, and order creation after verified payment). ADR-003
explicitly deferred inventory reservation and stock deduction: the catalog only
exposes a boolean `in_stock` flag on `products` and `product_variants`, with no
quantity model, no reservation model, and no oversell protection. ADR-003 and the
Sprint 9 handoff both require a follow-up inventory ADR/sprint before any
reservation or deduction code is written.

Sprint 10 introduces an **Inventory** bounded context that adds quantity tracking,
short-lived reservations tied to checkout, and one-time deduction on confirmed
sale. This must be layered onto the existing checkout lifecycle without breaking
its invariants:

- `Cart` and `CheckoutSession` may exist before payment.
- `Order` is created **only** after a verified successful payment
  notification/webhook (`payment_intent.succeeded` today; YooKassa later per
  ADR-004).
- Order creation, payment-record update, session completion, and cart conversion
  already run inside a single unit-of-work `commit()` in
  `WebhookService._handle_payment_succeeded`, guarded by an
  order-per-checkout-session uniqueness check.

This ADR must prevent oversell under concurrency while preserving those
invariants and the existing idempotency guarantees. It must **not** start the
YooKassa payment-provider migration (ADR-004) or touch payment-provider adapters.

## Decision Drivers

- Prevent oversell under concurrent checkouts of the same variant.
- Reserve stock at the point of purchase intent, not while browsing.
- Deduct stock exactly once, bound to confirmed order creation.
- Release reserved stock deterministically on failure, cancellation, and
  abandonment.
- Preserve the checkout/payment/order invariants and idempotency from ADR-003.
- Keep payment-provider code untouched (ADR-004): reservation/deduction hook into
  provider-neutral checkout and order-creation paths only.
- Follow feature-first DDD / Clean Architecture: repositories behind ports,
  application services own transactions, no business logic in controllers or
  repositories.

## Decision

### 1. Inventory as a separate bounded context (aggregate boundaries)

Introduce an **Inventory** context under
`apps/api/app/features/inventory/` (feature-first DDD, sibling to `catalog` and
`checkout`). The aggregate root is the **InventoryItem**, keyed one-to-one to a
catalog `product_variants.id` (the smallest unit of sale per ADR-002).

- `inventory_items` — one row per variant:
  - `id`, `variant_id` (unique FK → `product_variants.id`),
    `quantity_on_hand`, `quantity_reserved`, `version` (optimistic lock).
  - DB CHECK invariants:
    `quantity_on_hand >= 0`, `quantity_reserved >= 0`, and
    `quantity_on_hand >= quantity_reserved`.
  - **Available to promise** is derived, never stored:
    `available = quantity_on_hand - quantity_reserved`.
- `inventory_reservations` — one row per reserved variant line per reference:
  - `id`, `variant_id` (FK → `product_variants.id`), `quantity`,
    `expires_at`, `reference_type`, `reference_id`, plus a reservation
    `status` and timestamps.
  - `reference_type` = `"checkout_session"` and `reference_id` =
    `checkout_sessions.id` for this sprint (the column is typed generically so
    future references — e.g. admin holds — can reuse the table).

**Relationship to catalog:** the Inventory context *references* the catalog
variant by ID only. It does not modify catalog tables and does not own product or
variant data. The legacy boolean `in_stock` remains a display hint; authoritative
availability now comes from `inventory_items`. Catalog remains the source of
truth for what a variant *is*; Inventory is the source of truth for how many
*exist and are claimable*.

**Relationship to checkout:** the checkout context depends on an inventory port
(`IInventoryService` / `IInventoryRepository`) via dependency injection. Checkout
never reads or writes inventory tables directly; it calls the inventory
application service. Reservations are correlated to a `CheckoutSession` through
`reference_type`/`reference_id`, keeping the two contexts decoupled behind an
interface. No cross-context foreign key is added from checkout into inventory (the
correlation is by value), so the contexts stay independently deployable/testable.

### 2. Reservation timing — at checkout session creation / revalidation

Stock is reserved when the customer commits to purchase, defined as **checkout
session creation** (`CheckoutService.create_checkout_session`), *not* when an item
is added to the cart.

- Add-to-cart performs an availability *check* only (read of
  `available`), never a reservation. Carts can be long-lived and abandoned;
  reserving there would strand stock.
- When a checkout session is created, the checkout service asks the inventory
  service to reserve the exact quantities of the frozen checkout-session line
  snapshots, using `reference_type="checkout_session"`,
  `reference_id=<session.id>`, and a TTL (`expires_at = now + reservation_ttl`).
- On **revalidation** (currently `CheckoutService.create_payment_intent`, which
  re-validates the cart before creating the provider intent), the inventory
  service re-affirms the existing reservation set for that session and refreshes
  its TTL. If the reservation expired or was released, revalidation re-reserves
  (subject to current availability) or fails the checkout with an out-of-stock
  error.
- If any line cannot be fully reserved, checkout-session creation fails atomically
  with a domain out-of-stock error; no partial reservation set is persisted.

### 3. Deduction timing — once, on confirmed order creation

Stock is deducted **exactly once**, only on the verified successful payment path
that creates the `Order`.

- Deduction happens inside the **same unit-of-work transaction** as order
  creation in `WebhookService._handle_payment_succeeded`, immediately alongside
  `create_order` / `update_payment_record` / `mark_cart_converted`, before the
  single `commit()`.
- Deduction converts the reservation into a sale for each order line:
  decrement `quantity_on_hand` by the deducted quantity **and** decrement
  `quantity_reserved` by the same amount (releasing the hold as it is consumed),
  then mark the reservation `status = "committed"`. Net effect: `available` is
  unchanged at deduction time (it was already reduced at reservation), while
  `quantity_on_hand` now reflects the physical decrement.
- Deduction is keyed to the checkout session's reservation set, so it operates on
  the same quantities that were frozen and reserved — never on live cart state.

### 4. Release timing — explicit failure/cancel paths plus TTL expiry

Reserved-but-not-sold stock is released through three deterministic paths:

1. **Payment failure / cancellation:** the existing
   `_handle_payment_failed` and `_handle_payment_canceled` webhook handlers (and
   any explicit checkout-cancel action) call the inventory service to release the
   session's active reservation set: decrement `quantity_reserved` by each
   reserved quantity and mark reservations `status = "released"`.
2. **Explicit checkout cancellation:** when a checkout session moves to
   `CANCELED`/`EXPIRED` through an explicit user/system action, its active
   reservations are released via the same path.
3. **TTL expiry (abandonment):** a periodic cleanup sweep releases reservations
   whose `expires_at` has passed and whose reference session is not `COMPLETED`.
   Expiry release is the safety net for abandoned checkouts that never reach a
   terminal webhook. Cleanup is idempotent and only acts on reservations still in
   an `active` status.

Release only ever decrements `quantity_reserved` (never `quantity_on_hand`), so
it can never fabricate stock and always preserves the invariant.

### 5. Concurrency strategy — row-level locking + version guard

Reserve, deduct, and release are read-modify-write operations on
`inventory_items` and must be serialized per variant:

- The inventory application service performs each mutation inside a database
  transaction and acquires a **row-level lock** on the affected
  `inventory_items` row (`SELECT ... FOR UPDATE`) before recomputing availability
  and writing. This serializes concurrent checkouts contending for the same
  variant and is the primary oversell guard.
- The `version` column provides **optimistic concurrency** as defense-in-depth:
  each mutation increments `version` and asserts the expected prior value, so any
  read-modify-write that escapes the lock path (or a future lock-free read model)
  still fails rather than oversells.
- The database CHECK `quantity_on_hand >= quantity_reserved` (and the
  non-negative checks) are the final backstop: a reservation that would violate
  the invariant is rejected by the database even if application logic regresses.
- Locks are acquired in a deterministic order (e.g. sorted by `variant_id`) when a
  session reserves multiple variants, to avoid deadlocks between concurrent
  multi-line checkouts.
- Reservation/deduction transactions are kept short and never span external
  payment-provider network calls.

Chosen approach: **pessimistic row locking as the primary mechanism, backed by the
`version` optimistic guard and DB CHECK constraints.** Pessimistic locking is
preferred as primary because checkout contention on hot variants is expected and
lock-wait is cheaper and simpler to reason about than optimistic retry storms
under high contention; the version column is retained so the model degrades safely
and supports future lock-free reads.

### 6. Idempotency — one active reservation set per checkout session

Reservation, deduction, and release must be safe under retries, browser
refreshes, duplicate checkout-session creation, and webhook redelivery:

- **One active reservation set per checkout session.** The set is identified by
  (`reference_type="checkout_session"`, `reference_id=session.id`). Re-invoking
  reservation for a session that already has an active set is a no-op (idempotent
  refresh/TTL extension), not a second reservation. This composes with ADR-003's
  existing idempotency: `create_checkout_session` already returns the existing
  session for a repeated `Idempotency-Key`, so it will not create a second
  reservation set.
- **Deduct at most once.** Deduction is gated by the existing
  `get_order_by_checkout_session` check: if an order already exists for the
  session, `_handle_payment_succeeded` returns early and does not deduct again.
  Combined with `stripe_webhook_events` event-ID dedup and the
  order-per-session uniqueness constraint, redelivered success webhooks cannot
  double-deduct. The reservation `status` transition to `committed` is itself
  guarded so a committed reservation is never deducted twice.
- **Release at most once.** Release only affects reservations still in `active`
  status; a reservation already `committed`, `released`, or `expired` is skipped.
  Redelivered failure/cancel webhooks and overlapping TTL sweeps therefore cannot
  double-release (which would otherwise inflate availability).

### 7. Scope exclusions

Explicitly **out of scope** for this ADR/sprint:

- No warehouse / multi-location / multi-bin inventory (single logical stock pool
  per variant). Multi-location is a future ADR.
- No admin inventory management UI or stock-adjustment API (initial quantities are
  set via seed/migration/back-office scripts).
- No payment-provider migration and no changes to payment-provider adapters — the
  YooKassa migration remains the final project gate per ADR-004. Reservation and
  deduction attach only to provider-neutral checkout and order-creation paths.
- No backorder, preorder, or negative-stock allowance. A line that cannot be fully
  reserved fails checkout.
- No inventory ledger/audit-history table, low-stock alerting, or demand planning
  in this sprint (may follow later).

## Considered Options

### Reservation point

#### Option A: Reserve at add-to-cart

- Pros: earliest possible hold; simplest mental model for "in my cart = mine".
- Cons: carts are long-lived and frequently abandoned; strands stock, causes false
  out-of-stock, and needs aggressive expiry. **Rejected.**

#### Option B: Reserve at checkout session creation/revalidation (chosen)

- Pros: reserves only at genuine purchase intent; bounded, short-lived holds;
  aligns with the frozen checkout-session line snapshots.
- Cons: a variant can go out of stock between add-to-cart and checkout — surfaced
  as an explicit revalidation error, which is acceptable and expected.

#### Option C: Reserve only at payment intent creation

- Pros: reserves even closer to payment.
- Cons: leaves a window where the checkout session exists but stock is not held,
  weakening oversell protection during the checkout form step. **Rejected** in
  favor of reserving at session creation and re-affirming at payment step.

### Concurrency mechanism

#### Option A: Optimistic version-only

- Pros: no lock contention on reads; simple happy path.
- Cons: retry storms and starvation on hot variants under heavy contention.
  Retained only as a secondary guard.

#### Option B: Pessimistic row lock (`SELECT ... FOR UPDATE`) + version + DB CHECK (chosen)

- Pros: serializes contended writes deterministically; simplest correct behavior
  under contention; DB CHECK is a hard backstop against oversell.
- Cons: lock waits under extreme contention; mitigated by short transactions and
  deterministic lock ordering.

#### Option C: Application-level distributed lock (e.g. Redis)

- Pros: works across DB boundaries.
- Cons: adds infrastructure and a new failure mode; unnecessary for a single
  PostgreSQL primary. **Rejected** (revisit if inventory is sharded/replicated).

### Deduction point

#### Option A: Deduct at reservation

- Cons: deducts stock for unpaid/abandoned checkouts; requires re-crediting on
  every failure and complicates reconciliation. **Rejected.**

#### Option B: Deduct on confirmed order creation, in the same transaction (chosen)

- Pros: deduction is bound to a real, paid, immutable order; exactly-once via the
  existing order-per-session guard; no separate reconciliation step.
- Cons: deduction depends on the webhook order-creation path — acceptable and
  consistent with ADR-003/ADR-004 invariants.

## Consequences

### Positive

- Oversell is prevented under concurrent checkout via row locking, version guard,
  and a hard DB invariant.
- Stock is held only during genuine, time-boxed purchase intent and released
  deterministically on failure, cancellation, and abandonment.
- Deduction is exactly-once and reuses the existing idempotent order-creation
  transaction; no changes to payment-provider code.
- Inventory is a clean, independently testable bounded context behind ports,
  consistent with catalog/checkout boundaries and ADR-002.
- The design is provider-neutral, so the later YooKassa migration (ADR-004) does
  not need to revisit reservation/deduction logic.

### Negative

- Additional write path and locking on the hot checkout flow; requires
  short-transaction discipline and correct lock ordering.
- Customers may hit out-of-stock at checkout even after adding to cart (a
  deliberate, correct trade-off of reserving at checkout rather than add-to-cart).
- A background TTL-expiry sweep is required; if it fails to run, abandoned
  reservations reduce availability until it recovers.
- Existing catalog `in_stock` and new quantity truth can diverge until seed/back-
  office data initializes `inventory_items` for all variants.

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Deadlocks on multi-line checkouts | Medium | Deterministic lock ordering by `variant_id`; short transactions |
| Reservation leak (sweep not running) | Medium | Idempotent TTL cleanup job + monitoring/alert on stuck reservations |
| Double-deduct on webhook redelivery | High | Order-per-session guard + event-ID dedup + reservation `committed` state |
| Double-release inflating stock | High | Release only acts on `active` reservations; terminal states are skipped |
| Variants without an `inventory_items` row | Medium | Backfill migration/seed for all variants; treat missing row as zero-available (fail closed) |
| Lock contention on hot variants | Medium | Short transactions, no external calls under lock; revisit if latency SLAs regress |

## Implementation Notes

- New feature module `apps/api/app/features/inventory/` with
  `domain/` (entities, ports), `application/` (inventory service owning the
  reserve/deduct/release transactions), `infrastructure/persistence/`
  (`InventoryItemModel`, `InventoryReservationModel`, repository).
- Additive Alembic migration `007_*` creating `inventory_items` and
  `inventory_reservations` with the CHECK constraints, the unique `variant_id`,
  indexes on `variant_id`, `(reference_type, reference_id)`, `expires_at`, and
  `status`, plus a backfill seeding `inventory_items` for existing variants.
- Checkout integrates via an injected inventory port: reserve in
  `CheckoutService.create_checkout_session`, re-affirm/extend in
  `create_payment_intent`, deduct in `WebhookService._handle_payment_succeeded`
  (same transaction as order creation), release in `_handle_payment_failed` /
  `_handle_payment_canceled` and explicit cancel.
- Do not add business logic to controllers or repositories; the inventory
  application service owns transaction boundaries and locking.
- Do not modify payment-provider adapters or start the YooKassa migration
  (ADR-004).
- Tests (per testing standards) must cover: concurrent reservation of the same
  variant (no oversell), out-of-stock checkout behavior, reserve/deduct/release
  idempotency under webhook redelivery, TTL expiry release, and a checkout
  regression proving the ADR-003 order-creation invariant still holds.

## Related Decisions

- ADR-002: Product Variants and Pricing (variant = unit of sale)
- ADR-003: Stripe Checkout, Payments, and Order Creation (deferred inventory here)
- ADR-004: YooKassa as Final Payment Integration (do not migrate provider here)

## Related Rules

- `ecommerce/02-checkout`
- `ecommerce/04-orders`
- `database/01-schema`, `database/02-migrations`, `database/03-indexing`,
  `database/04-queries`
- `architecture/01-ddd`, `architecture/02-module-boundaries`,
  `architecture/05-domain-modeling`
- `testing/00-testing`
