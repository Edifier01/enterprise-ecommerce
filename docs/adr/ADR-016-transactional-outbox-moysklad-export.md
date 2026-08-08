# ADR-016: Transactional Outbox for MoySklad Order Export

## Status

Accepted

## Date

2026-08-08

## Context

ADR-010 exports paid site orders to MoySklad as `customerorder` on payment success.
The prod readiness audit (2026-08-08) identified **L7**: export HTTP ran inside the
order-creation webhook path **before** database `commit()`, holding inventory row
locks and swallowing failures. ADR-015's `quantity_awaiting_fulfillment` depends on
reliable export (`moysklad_order_id` set); guest orders also failed export when
`guest_email` was missing (L2).

A cron fallback (`run_pending_order_exports`) already polls unexported confirmed
orders, but inline export under the webhook transaction couples payment completion
to ERP latency and masks failures until the next cron tick.

## Decision Drivers

- Decouple order persistence from MoySklad HTTP (no external I/O under inventory lock).
- At-least-once export with idempotent enqueue (safe webhook redelivery).
- Observable backlog for ops (`integration_outbox` + existing pending-export counts).
- Minimal scope: MoySklad order export only (not a general event bus).

## Decision

1. **`integration_outbox` table** — one row per `(event_type, aggregate_id)`:
   - `event_type = 'moysklad.order_export'`
   - `aggregate_id = orders.id`
   - `status`: `pending` → `completed` | `failed`
   - `attempts`, `last_error`, timestamps

2. **Enqueue in the payment webhook transaction** — after `create_order`, insert
   outbox row in the same SQLAlchemy session. Unique constraint prevents duplicate
   enqueue on webhook retry.

3. **Remove synchronous export from `WebhookService`** — no HTTP to MoySklad before
   `commit()`.

4. **Processor** — `run_pending_outbox_exports()` called from the existing MoySklad
   cron loop (after stock sync / reconciliation). Uses `ExportOrderUseCase` per row.
   Failed rows stay `pending` with incremented `attempts` for the next cron pass.
   `run_pending_order_exports()` remains as a safety net for orders predating outbox.

5. **Guest email (L2)** — `checkout_sessions.guest_email` captured at session
   creation for unauthenticated retail checkout; copied to `orders.guest_email` on
   payment success. Required when `user_id IS NULL`.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| Cron-only (remove inline, no outbox table) | No enqueue audit trail; race on webhook redelivery before cron |
| Message broker (Redis/RabbitMQ) | Extra infra on single VPS; overkill for one integration |
| Keep inline export, move after commit in webhook | Still blocks webhook response on MS latency; no retry state |

## Consequences

- Positive: webhook txn is DB-only; export retries are observable; ADR-015 awaiting
  path becomes reliable once guest email is wired.
- Negative: export is eventually consistent (cron interval); orders may briefly lack
  `moysklad_order_id` until processor runs.

## Related

- ADR-010 — MoySklad integration, order export
- ADR-015 — ERP stock reconciliation (awaiting counter)
- PROD-READINESS-AUDIT-2026-08-08 §2 L7, §5 Wave A
