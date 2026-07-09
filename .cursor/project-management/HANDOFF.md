# Handoff

## Current Agent

Implementation Agent (Sprint 10 formal closeout complete)

## Previous Agent

Implementation Agent (Sprint 9 formal closeout)

## Completed Work

**Sprint 10 — Inventory Reservation/Deduction (2026-07-09):**

Formally closed Sprint 10 per approved Feature Plan and ADR-005.

**Delivered:**

- Inventory bounded context: `apps/api/app/features/inventory/` (domain, application, infrastructure)
- Migration `007_add_inventory_reservations.py` — `inventory_items`, `inventory_reservations` with CHECK constraints and variant backfill
- Checkout integration:
  - Reserve at `CheckoutService.create_checkout_session`
  - Re-affirm at `create_payment_intent`
  - Deduct in `WebhookService._handle_payment_succeeded` (same transaction as order creation)
  - Release on payment failed/canceled webhooks
- Cart availability checks via `InventoryService.ensure_available` (HTTP 409)
- Frontend: `getCheckoutErrorMessage` RU messaging in cart/checkout clients
- `seed_dev.py`: seeds `inventory_items` with default quantities (50 in-stock / 0 out-of-stock)

**Quality gate (this session):**

- Backend: `python -m pytest tests/ -q` with `DATABASE_URL=sqlite+aiosqlite:///:memory:` — **51/51 passed**
- Backend lint: `python -m ruff check app tests` — **passed**
- Frontend TypeScript: `npx tsc --noEmit` — **passed**

**Architectural decisions:**

- ADR-005: inventory reservation lifecycle, concurrency (row lock + version + DB CHECK), idempotency boundaries

**PM state updated:**

- `CURRENT_CONTEXT.md` — Sprint 10 CLOSED
- `PROJECT_STATUS.md` — Sprint 10 closed; next actions updated
- `TASKS.md` — Sprint 10 section marked COMPLETED
- `HANDOFF.md` — this handoff

## Files Changed

| File | Change |
|------|--------|
| `apps/api/app/features/inventory/` | Inventory bounded context (entities, ports, service, models, repository) |
| `apps/api/alembic/versions/007_add_inventory_reservations.py` | Migration for inventory tables |
| `apps/api/app/features/checkout/application/checkout_service.py` | Reserve/re-affirm inventory on checkout |
| `apps/api/app/features/checkout/application/webhook_service.py` | Deduct/release inventory on payment events |
| `apps/api/app/features/checkout/application/cart_service.py` | Availability checks on cart mutations |
| `apps/api/app/features/checkout/presentation/router.py` | 409 handling for insufficient stock |
| `apps/api/app/features/checkout/presentation/dependencies.py` | Inventory DI wiring |
| `apps/api/tests/test_checkout.py` | Inventory reservation/deduction/release tests |
| `apps/web/src/lib/checkout/api.ts` | RU out-of-stock error helper |
| `apps/web/src/components/store/checkout/cart-client.tsx` | Stock error display |
| `apps/web/src/components/store/checkout/checkout-payment-client.tsx` | Stock error display |
| `apps/api/scripts/seed_dev.py` | Seed inventory quantities for variants |
| `docs/adr/ADR-005-inventory-reservation-and-deduction.md` | Inventory ADR |
| `.cursor/project-management/*` | Sprint 10 closeout PM sync |

## Known Issues

- Stripe-specific checkout code remains as Sprint 9 foundation/prototype; YooKassa migration is final project gate work per ADR-004.
- TTL expiry sweep (`expire_active_reservations`) is implemented but not yet scheduled as a background job.
- Search remains a UI placeholder — no backend search API yet.
- `localhost:3001` is outside current API CORS origins; use `localhost:3000` for local smoke.

## Verification Results

- Backend pytest: **51/51 green**
- Backend ruff: **passed**
- Frontend tsc: **passed**
- Quality gate: **✅ PASSED**

## Next Recommended Action

Pick next Phase 24 epic per product priority:

- Search API backend + wire `/search` page
- Order history UI for authenticated customers
- Background job for inventory reservation TTL expiry

Final project gate (later): YooKassa payment integration + full browser payment smoke per ADR-004.
