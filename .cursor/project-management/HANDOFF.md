# Handoff

## Latest Session

Composer 2.5 — Wave A remainder: L3 + guest email + ADR-016 (2026-08-08)

## Completed Work

**Wave A — stop-the-bleeding before YooKassa:**

1. **L3 payment retry** — `payment_failed` webhook no longer cancels session or releases reservation; retry `succeeded` creates order. Tests: `test_payment_failed_keeps_reservation_for_retry`, `test_payment_failed_then_succeeded_creates_order`.
2. **Guest email (L2)** — `checkout_sessions.guest_email` (migration 022); required for guest retail checkout; copied to `orders.guest_email` on webhook; frontend email field for unauthenticated users.
3. **ADR-016 outbox** — `integration_outbox` table; enqueue on order creation in webhook txn; MS HTTP removed from pre-commit path; `run_pending_outbox_exports` in MoySklad cron loop.

**Prior commit:** `ee684d8` — ADR-015 ERP stock reconciliation + prod audit + AI-003.

## Files Changed

| Path | Change |
|------|--------|
| `docs/adr/ADR-016-transactional-outbox-moysklad-export.md` | new ADR |
| `apps/api/alembic/versions/022_wave_a_guest_email_outbox.py` | migration |
| `apps/api/app/features/checkout/application/webhook_service.py` | L3 + guest email + outbox enqueue |
| `apps/api/app/features/checkout/application/checkout_service.py` | guest email validation |
| `apps/api/app/features/integrations/moysklad/**` | outbox repo + processor |
| `apps/web/src/components/store/checkout/**` | guest email UI |
| `apps/api/tests/test_checkout.py` | L3 + guest email tests |
| `.cursor/project-management/*` | Wave A status |

## Known Issues / residual

- Export eventually consistent until cron runs (by design per ADR-016).
- Wave A tail still open: L4 stable idempotency keys, A5 security fail-fast, L5 webhook missing-payment swallow.
- Deploy: `alembic upgrade head` (021 + 022) on staging/prod.

## Next Recommended Action

1. Deploy migrations 021–022; smoke guest checkout + MS export backlog.
2. `/start-feature YooKassa payment integration` (ADR-004).
3. Optional parallel: Wave A tail (L4/A5) or Wave 0 ops.

---

## Previous Session

Grok 4.5 — ADR-015 Option D implementation + review fixes (2026-08-08)
