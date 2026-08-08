# ADR-015: ERP Stock Reconciliation (MoySklad ↔ Local Inventory)

**Status:** Accepted  
**Date:** 2026-08-08  
**Accepted:** 2026-08-08 (Ed — accept defaults on Open Questions)

## Context

ADR-005 made local PostgreSQL authoritative for *claimable* quantity: checkout
reserves against `inventory_items`, and `deduct_reserved` decrements
`quantity_on_hand` inside the confirmed order-creation transaction.

ADR-010 made MoySklad authoritative for *ERP-owned* fields, including
`quantity_on_hand` (field ownership matrix, §3), synced unidirectionally
MS → site into the same column.

Two authoritative writers now share one column, and neither knows about the
other. `PROD-READINESS-AUDIT-2026-08-08` §2 L1 / §3 P0-STOCK classifies the
result as a release-blocking oversell loop.

### The defect, step by step

`catalog_sync_repository.apply_stock` writes
`item.quantity_on_hand = max(quantity, reserved)`. Order export
(`export_order.py`) creates a MoySklad **`customerorder`**, which does not
reduce the ERP warehouse balance — only a `demand` (отгрузка) does. So:

| t | Event | MS `stock` | local `on_hand` | local `reserved` | site sellable |
|---|-------|-----------|-----------------|------------------|---------------|
| t0 | Idle, 5 units in warehouse | 5 | 5 | 0 | 5 |
| t1 | Checkout session reserves 5 | 5 | 5 | 5 | 0 |
| t2 | Payment succeeds → order + `deduct_reserved` | 5 | 0 | 0 | 0 |
| t3 | Export creates MS `customerorder` (balance unchanged) | 5 | 0 | 0 | 0 |
| t4 | Next stock sync → `apply_stock(5)` | 5 | **5** | 0 | **5 — oversell** |
| t5 | Warehouse ships (MS `demand`) | 0 | 5 | 0 | 5 (wrong until next sync) |

At t4 the site resells goods that are already sold and physically committed.
The window is bounded only by warehouse picking latency — hours to days — and
the cron sync (ADR-010 §6, every 10 min) guarantees the window is entered.

### Three root causes

1. **Two writers, one column.** `deduct_reserved` and `apply_stock` both own
   `quantity_on_hand` and overwrite each other's intent.
2. **No representation of "sold on site, not yet consumed in ERP."** The ERP
   physical balance and the site's committed-sales position are different
   quantities; the schema has a slot for only one of them.
3. **`max(ms_quantity, reserved)` fabricates units.** It exists solely to
   satisfy the migration-`007` CHECK `quantity_on_hand >= quantity_reserved`
   when ERP truth is below an in-flight reservation. A hard cross-column
   invariant against a mirrored external column forces the code to invent
   stock rather than report a conflict.

Cause 3 also blocks the honest fix: as long as that CHECK stands, no
implementation can let the mirror sit below site commitments.

### Related open defects (not solved here)

- **L7 / ADR-016:** MS export runs as HTTP inside the order-creation
  transaction under the inventory `FOR UPDATE` lock, best-effort, swallowing
  exceptions. Any reconciliation model that keys off "export succeeded"
  inherits this fragility. ADR-015 therefore treats a missing export as an
  *observable, alerting* condition rather than assuming reliability.
- **L2 (guest email):** guest orders currently always fail export, so today
  they would never produce a reconciliation record.
- **L3 (failed → retry):** reservation lifecycle bug on payment retry.

## Decision Drivers

- **Never oversell.** A paid unit must stay unsellable until the ERP balance
  itself reflects its removal. No sync may raise sellable quantity back over a
  completed sale.
- **Never phantom-out-of-stock.** A legitimate ERP restock must become
  sellable at the next sync without manual intervention.
- **Convergent, not path-dependent.** State must be recomputable from
  first principles. A model whose correctness depends on every past event
  having been applied exactly once will drift in production and cannot be
  repaired without a manual stock count.
- **Preserve ADR-010 field ownership.** The site must not write stock back to
  MoySklad (ADR-010 Option B was rejected).
- **Preserve ADR-005 boundaries.** Inventory must not read the checkout/orders
  context; availability stays a single-row read on the hot path.
- **Keep the availability read path O(1).** `get_available_quantity` is called
  per cart line, per checkout validation, per PLP/PDP render.
- **Additive migration, no data loss,** reversible per `database/02-migrations`.
- **Decide before YooKassa** (audit §5 Wave A1): taking real money on an
  oversell-capable model is the highest-severity business risk in the project.

## Decision

Adopt **Option D: ERP mirror + site-owned `quantity_awaiting_fulfillment`
counter, reconciled against MoySklad fulfillment state.**

The design separates the two quantities that are currently conflated:

```
quantity_on_hand              ERP physical balance         writer: MS sync only
quantity_reserved             active checkout holds        writer: site (ADR-005)
quantity_awaiting_fulfillment sold on site, not yet        writer: site
                              consumed in the ERP balance

sellable (derived, never stored) =
    quantity_on_hand - quantity_reserved - quantity_awaiting_fulfillment
```

### 1. Ownership of `quantity_on_hand` after sync

| Variant | Owner of `quantity_on_hand` | Writers |
|---------|----------------------------|---------|
| `sync_source = moysklad` | **MoySklad** | `apply_stock` only |
| `sync_source = manual` | **Site** | local deduct / restore / admin adjust |

For MS-synced variants `quantity_on_hand` is a *mirror*: it is assigned, never
incremented or decremented, by the site. This makes ADR-010's ownership claim
literally true in code for the first time, and removes the write-write
conflict at its source.

`quantity_reserved` and `quantity_awaiting_fulfillment` are site-owned for all
variants and are never touched by sync.

### 2. `apply_stock` algorithm

```
apply_stock(variant, ms_stock):

    item = SELECT * FROM inventory_items
           WHERE variant_id = variant.id
           FOR UPDATE                          # NEW: sync must take the row lock

    if item is None:
        create(variant_id, on_hand = max(ms_stock, 0),
               reserved = 0, awaiting = 0)
        recompute_storefront_flags(variant, available = max(ms_stock, 0))
        return

    # ERP mirror — unconditional assignment, no max(), no fabrication
    item.quantity_on_hand = max(ms_stock, 0)
    item.version += 1

    commitments = item.quantity_reserved + item.quantity_awaiting_fulfillment
    if commitments > item.quantity_on_hand:
        # Expected transiently (ERP write-off, manual MS correction, ERP not
        # yet decremented for a settled order). Never inflate on_hand; never
        # silently drop a customer's active reservation.
        log.warning("inventory_erp_below_site_commitments",
                    variant_id, ms_stock,
                    reserved  = item.quantity_reserved,
                    awaiting  = item.quantity_awaiting_fulfillment)
        # surfaced on /admin/integrations/moysklad (ADR-010 §11)

    available = max(item.quantity_on_hand - commitments, 0)
    recompute_storefront_flags(variant, available)
```

Notes:

- **Sync takes `FOR UPDATE`.** Today it does not (audit §3 P2), so sync races
  concurrent reservations. Because sync now assigns rather than computes from
  `reserved`, the lock is needed only to serialize the flag recompute and the
  `version` bump — but it is required for the drift check to be meaningful.
- **`ms_stock` remains MoySklad's `stock` field** (`ids._read_quantity`), i.e.
  the physical balance, *not* `quantity` (= `stock − reserve + inTransit`).
  `inTransit` must never be sellable, and MS `reserve` is not currently
  produced by us (see Alternative D2).
- **`available` is floored at 0 for display only.** The stored counters are
  never clamped by sync; a negative computed position is a drift signal, and
  clamping would either fabricate stock or silently cancel a live checkout.
- Product-level `in_stock` rollup stays as-is (any variant in stock ⇒ product
  in stock).

### 3. Does local `deduct_reserved` stay?

**It stays in the repository and stays on the `manual` path. It leaves the
MoySklad path.** The deduction point (ADR-005 §3 — same transaction as order
creation) is unchanged; only the *effect* is routed by ownership:

```
commit_reservation(variant_id, quantity, erp_managed: bool):
    if erp_managed:                       # sync_source = moysklad
        quantity_reserved              -= quantity     # hold consumed
        quantity_awaiting_fulfillment  += quantity     # sale recorded
        # quantity_on_hand UNTOUCHED — the ERP still holds these units
    else:                                 # sync_source = manual
        quantity_on_hand  -= quantity     # existing deduct_reserved
        quantity_reserved -= quantity
    reservation.status = "committed"
```

Sellable drops by `quantity` in both branches, and stays dropped across
syncs, because `awaiting` is invisible to `apply_stock`.

`erp_managed` is resolved by the inventory service through a narrow catalog
port (`IVariantSourcePort.is_erp_managed(variant_id)`) — the Inventory context
must not import catalog models directly (`architecture/02-module-boundaries`).

### 4. How `reserved` interacts

- The reservation gate becomes
  `on_hand − reserved − awaiting >= requested`. Without the `awaiting` term a
  paid-but-unshipped unit would be re-reservable, which is the same oversell
  by a different route.
- `release` / TTL expiry are unchanged: they only decrement `reserved`, never
  `on_hand`, never `awaiting`.
- `reserved` and `awaiting` are disjoint by construction: commit moves units
  from one to the other in a single locked transaction.
- **Order cancellation changes.** `UpdateAdminOrderStatusUseCase` currently
  calls `restore_order_lines` → `restore_on_hand`. For ERP-managed variants
  that would inflate the mirror above ERP truth until the next sync corrects
  it. Cancellation must instead *settle*: `awaiting -= quantity`. Nothing is
  restored to `on_hand`, because nothing was ever removed from it — the ERP
  balance never moved. `restore_on_hand` remains correct for `manual`
  variants only. This also fixes the MS-driven cancel path
  (`sync_order_return.py`) and the returns hook (ADR-010 §13).

### 5. Reconciliation — how `awaiting` is cleared

`awaiting` must be released when, and only when, the ERP physical balance
drops for that sale. Two mechanisms, both required:

**(a) Per-order settlement (primary, deterministic).**
Extend the existing cron (ADR-010 §6 fallback) with a reconciliation pass:

```
reconcile_erp_fulfillment(limit = N):
    orders = SELECT id, moysklad_order_id, lines
             FROM orders
             WHERE moysklad_order_id IS NOT NULL
               AND erp_fulfilled_at IS NULL          # partial index
             ORDER BY created_at
             LIMIT N

    for order in orders:
        ms = client.get_customer_order(order.moysklad_order_id)
        shipped = ms.shipped_quantity_by_assortment   # per position

        for line in order.lines:
            settled = min(line.quantity, shipped.get(line.assortment_id, 0))
            unsettled = line.quantity - already_settled(line) - settled
            if settled > already_settled(line):
                inventory.settle_awaiting(line.variant_id,
                                          settled - already_settled(line))

        if all lines fully shipped:
            order.erp_fulfilled_at = now
```

Per-position quantities (not all-or-nothing) support partial shipment, which
is normal at a single warehouse with mixed baskets.

**(b) Per-variant convergence sweep (safety net, self-healing).**
After (a), rewrite each touched variant's counter to the authoritative sum:

```
expected_awaiting(variant) =
    Σ (line.quantity - settled_quantity)
      over order_lines of orders WHERE moysklad_order_id IS NOT NULL
                                  AND erp_fulfilled_at IS NULL
```

and `SET quantity_awaiting_fulfillment = expected_awaiting` under the row
lock. This is what makes the model **convergent** rather than
decrement-dependent: a missed settlement, a duplicated webhook, a crashed
worker, or a manual DB fix self-corrects on the next pass. It is the single
most important property of this decision and the reason Option C was
rejected.

The sweep reads the orders context, so it lives in the **`integrations/moysklad`
application layer** (which already legitimately reads orders via
`OrderExportRepository`) and writes inventory through the inventory port. The
Inventory context itself never reads orders, and the hot availability path
never joins them.

**Stale-order guard.** An exported order that MoySklad never ships holds stock
forever. Emit an admin alert on
`erp_fulfilled_at IS NULL AND created_at < now() - interval 'D days'`
(surfaced on `/admin/integrations/moysklad`). Auto-settling after a timeout is
deliberately **not** decided here — it trades a phantom-out-of-stock for a
potential oversell, and needs Ed's business call (see Open Questions).

**Never-exported orders.** If export failed (L2/L7), `moysklad_order_id` is
NULL, so `awaiting` is never created and the old oversell reappears for that
order. `count_pending_exports()` already exists; it must be promoted to an
alerting metric, and ADR-016's outbox is the real fix. Documented as a known
residual risk, not silently accepted.

### 6. `in_stock` denormalization (P1-DENORM)

**Yes — `in_stock` is recomputed on every availability-changing transition,**
not only on sync. Today only `apply_stock` and `_ensure_inventory_item` write
it, so PLP `?in_stock=true` lies from the moment of a sale until the next MS
sync.

Recompute after: reserve, release, TTL expiry, commit, settle, cancel-settle,
sync — using the existing single rule
`is_in_stock_for_storefront(available)` (`storefront_min_available_stock`,
currently 3) plus the product-level rollup.

Because the writer is now sometimes the Inventory context, the write goes
through a port — `IStorefrontAvailabilityPort.apply_availability(variant_id,
available)` — implemented in **catalog** infrastructure. Inventory must not
import `ProductVariantModel`. `catalog_sync_repository` may call the same
implementation, removing the duplicated flag logic it carries today.

Out of scope here: the frontend/cart check that tests the boolean instead of
the `< 3` threshold. That is a separate P1 fix and needs no ADR — the
threshold rule already lives in one place.

### 7. Migration needs — **yes, additive (`021`)**

| # | Change | Rationale |
|---|--------|-----------|
| 1 | `inventory_items.quantity_awaiting_fulfillment INTEGER NOT NULL DEFAULT 0` + CHECK `>= 0` | The new counter |
| 2 | **Drop** CHECK `ck_inventory_items_on_hand_gte_reserved` | Root cause 3: a cross-column CHECK against a mirrored ERP column forces stock fabrication |
| 3 | `orders.erp_fulfilled_at TIMESTAMPTZ NULL` + partial index `(created_at) WHERE moysklad_order_id IS NOT NULL AND erp_fulfilled_at IS NULL` | Bounded reconciliation work set |

Optional (observability, not required): `inventory_items.erp_synced_at`.

Non-negativity CHECKs on all three counters are retained. `database/01-schema`
must be updated: the stated invariant becomes
`quantity_on_hand >= 0 AND quantity_reserved >= 0 AND quantity_awaiting_fulfillment >= 0`,
with `reserved + awaiting <= on_hand` enforced **at the reservation gate under
row lock** and monitored as a drift alert — no longer a DB constraint.

**Backfill** (in `021`, before the first post-deploy sync):

```sql
UPDATE inventory_items i
SET quantity_awaiting_fulfillment = COALESCE((
    SELECT SUM(ol.quantity)
    FROM order_lines ol JOIN orders o ON o.id = ol.order_id
    WHERE ol.variant_id = i.variant_id
      AND o.status = 'confirmed'          -- not shipped, not canceled
      AND o.moysklad_order_id IS NOT NULL
), 0);
```

Past local deducts have already been overwritten by past syncs, so this
reconstructs the correct committed-sales position from order history.
`erp_fulfilled_at` backfills to `NULL` for `confirmed` orders and to
`updated_at` for orders already `shipped` locally.

Downgrade: drop column 1 and 3, restore CHECK 2 (guarded by a pre-check that
no row violates it).

### 8. Out of scope

Explicitly **not** decided or delivered by ADR-015:

- **ADR-016 transactional outbox** for MS export (audit L7: HTTP under the
  inventory `FOR UPDATE` lock, best-effort, swallowed exceptions). ADR-015
  *depends on* export reliability and *monitors* its absence; it does not fix
  it.
- **YooKassa migration (ADR-004 / P0-YK).** This decision is payment-provider
  neutral, exactly as ADR-005 was, and does not touch provider adapters.
- **L3** payment-failed → retry reservation lifecycle, **L2** guest email,
  **L4** client idempotency keys. Separate Wave A fixes.
- **Writing stock back to MoySklad.** ADR-010 Option B stays rejected.
- **Setting `reserve` on exported `customerorder` positions.** Evaluated as
  Alternative D2; deferred until the outbox exists.
- **Multi-warehouse** (`MOYSKLAD_STORE_ID` remains single), backorder,
  preorder, negative stock — ADR-005 §7 exclusions stand.
- **Inventory ledger / audit history**, low-stock alerting, demand planning.
- **Frontend cart threshold UI** and admin stock-adjustment UX.
- **MS `demand` webhook subscription.** Recommended future upgrade to shorten
  the reconciliation window; the cron pass is sufficient for launch.

## Alternatives Considered

### Option A — Read-time formula: sellable = MS balance − qty on unshipped exported orders

Same *semantics* as the chosen option; different *placement*.

- **Pros:** no new counter; stateless and inherently convergent.
- **Cons:** the availability read path (`get_available_quantity`, called per
  cart line, per PLP/PDP render, per checkout validation) would have to join
  `orders`/`order_lines` filtered by ERP fulfillment state — an unbounded,
  ever-growing scan on the hottest query in the system, and a direct
  Inventory → Orders context read that ADR-005 §1 forbids. It would also
  force the same join into catalog list filtering for `in_stock`.
- **Rejected as the read model, adopted as the reconciliation invariant.** Option D materializes A's formula as a per-variant counter (§5b recomputes
  exactly A's expression), keeping O(1) reads and the context boundary.

### Option B — MS authoritative only: drop local deduct, sellable = MS − active reservations

- **Pros:** simplest schema; closest to a literal reading of ADR-010 §3.
- **Cons:** **does not fix the bug.** Reservations are consumed at payment
  (ADR-005 §3), and the MS balance does not move until shipment, so between
  payment and `demand` there is *no* subtrahend at all — precisely the t2–t5
  window in the Context table. Making it work requires holding the
  reservation until ERP shipment, which turns a 15-minute TTL hold into a
  multi-day one: TTL expiry would silently release paid orders, and
  `inventory_reservations` would become a fulfillment tracker it was not
  designed to be. It would also make availability depend on `MOYSKLAD_STORE_ID`
  reachability.
- **Rejected.**

### Option C — Soft sync: never raise `on_hand` above the previous local value while unshipped exported orders exist

- **Pros:** smallest diff; no migration.
- **Cons:** a monotonic ratchet (`min(ms_stock, previous_local)`) **suppresses
  legitimate restocks** — the merchant receives 50 units in MoySklad and the
  site refuses to sell them, converting an oversell into a silent revenue
  loss that requires manual intervention to clear. It is path-dependent: the
  result depends on the order and success of every past sync, so drift never
  converges and cannot be repaired without a physical stock count. It is also
  effectively untestable (correctness is a function of history, not state) and
  scoped per-variant while the trigger condition is per-order.
- **Rejected** — it violates the convergence and no-phantom-out-of-stock
  drivers.

### Alternative D2 — Set `reserve` on exported `customerorder` positions and read `stock − reserve`

MoySklad already implements this reconciliation natively: a `customerorder`
position carries a `reserve` quantity, the stock report exposes `reserve` per
store, and creating the `demand` atomically decrements `stock` and clears the
`reserve`. Adopting it would delete the need for a local counter entirely and
would make committed stock visible to warehouse staff inside MoySklad — a real
operational win.

- **Pros:** the ERP owns the whole reconciliation; no local counter, no
  settlement job, no drift.
- **Cons:** correctness becomes 100% dependent on the export succeeding, which
  today is best-effort, runs under the inventory lock, and swallows exceptions
  (L7) and always fails for guest orders (L2). A failed export would produce a
  silent oversell with no local record. It also requires reading
  `stock − reserve` (never `quantity`, which adds `inTransit`), and it mixes
  site reserves with merchant-made offline reserves in one field.
- **Deferred, not rejected.** Recommended as the target state *after*
  ADR-016's outbox makes export exactly-once and after §5's per-order
  settlement gives us a reconciliation record to compare against. Migrating
  later is cheap: `awaiting` goes to 0 and the subtrahend moves to the ERP
  read. Adopting it *now* would rest oversell protection on the least
  reliable path in the system.

### Alternative D3 — Keep the site sellable pool as a separate column, preserve all ADR-005 CHECKs

Add `erp_quantity_on_hand` as the mirror and keep `quantity_on_hand` as the
site pool.

- **Pros:** ADR-005's cross-column CHECK survives untouched.
- **Cons:** re-introduces two writers to the site pool, both computing
  `max(erp − awaiting, reserved)` — the same fabrication this ADR removes,
  with an extra column. **Rejected.**

## Consequences

### Positive

- The oversell loop is closed at its cause: `quantity_on_hand` has exactly one
  writer, and a completed sale is represented in a column sync cannot touch.
- Legitimate ERP restocks become sellable at the next sync, with no ratchet
  and no manual clearing.
- State is convergent: `awaiting` is recomputed from order history every pass,
  so any missed or duplicated event self-heals.
- ERP ↔ site divergence becomes *observable* (`inventory_erp_below_site_commitments`,
  stale-unfulfilled-order alert, pending-export count) instead of silently
  fabricating stock.
- `in_stock` stops lying between sales and syncs, fixing P1-DENORM with the
  single existing threshold rule.
- Payment-provider neutral: the YooKassa sprint inherits a sound stock model
  and needs no inventory rework.
- Partial shipments are handled natively (per-position settlement).

### Negative

- A third counter and a reconciliation job to operate and monitor. If the job
  stops, `awaiting` never clears and stock silently disappears from the
  storefront — the failure mode is conservative (lost sales, not oversell),
  but it needs alerting on job liveness.
- **ADR-005's DB backstop weakens.** Dropping
  `quantity_on_hand >= quantity_reserved` moves the last-resort oversell guard
  from a database CHECK to the locked application gate plus monitoring. This
  is a deliberate trade: the CHECK is what forced `apply_stock` to invent
  units, and it is not a true invariant once the column mirrors an external
  system. `database/01-schema` and ADR-005 §5 must be amended.
- Correctness still depends on MS order export succeeding, which is currently
  unreliable (L2/L7). Residual oversell risk remains until ADR-016.
- Reconciliation adds MoySklad API calls proportional to unfulfilled orders —
  must respect the 100 req / 5 s limit; bounded by the partial index and a
  batch limit.
- The MoySklad ACL must expose per-position shipped quantities;
  `get_customer_order` today returns only `deleted` and `state_name`.
- Local order status `shipped` (admin-driven) and `erp_fulfilled_at`
  (MS-driven) are now distinct concepts — operators and admin UI must not
  conflate them.

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Reconciliation job stops | Medium — stock vanishes from storefront | Liveness alert on `last_incremental_sync_at`; stale-unfulfilled-order alert |
| Export fails → no `awaiting` created | **High — oversell** | Alert on `count_pending_exports()`; ADR-016 outbox; guest-email fix (L2) |
| MS never ships an exported order | Medium — stock stranded | Age-based admin alert; auto-settle policy deferred to Ed |
| MS shipped-quantity semantics differ from assumption | High — wrong settlement | Verify against the live account before implementation; fall back to `demand`-link detection |
| Double settlement inflates sellable | High | Settlement is idempotent per line (`min` against remaining); §5b sweep overwrites rather than decrements |
| Dropping the cross-column CHECK regresses oversell guard | Medium | Reservation gate asserts under `FOR UPDATE`; drift alert; concurrency tests are mandatory |
| Backfill wrong on deploy | High | Run inside `021` before the first sync; verify sample variants against MoySklad manually |
| Sync now takes `FOR UPDATE` | Low | Short transactions, no HTTP under lock, deterministic ordering by `variant_id` |

## Implementation Notes

- Migration `021_erp_stock_reconciliation.py` per §7.
- Inventory domain: add `quantity_awaiting_fulfillment` to `InventoryItem`;
  `available_quantity` becomes `on_hand − reserved − awaiting`.
- Inventory ports: `commit_reservation(erp_managed)`, `settle_awaiting`,
  `set_awaiting`; keep `deduct_reserved` / `restore_on_hand` for the `manual`
  path. **All four repository methods currently no-op when the
  `inventory_items` row is missing** (audit §7) — that must become an explicit
  error, or reconciliation will silently skip variants.
- New ports (thin, one method each): `IVariantSourcePort.is_erp_managed`,
  `IStorefrontAvailabilityPort.apply_availability` — both implemented in
  catalog infrastructure.
- `apply_stock` per §2, including `FOR UPDATE` and the drift log.
- New use case `integrations/moysklad/application/reconcile_stock.py` per §5,
  wired into `sync_scheduler`.
- Extend `IMoySkladClient.get_customer_order` (or add
  `get_customer_order_shipped_quantities`) to return per-position shipped
  quantities.
- `UpdateAdminOrderStatusUseCase` cancel path: settle for ERP-managed
  variants, restore for manual.
- Admin `/admin/integrations/moysklad`: surface drift count, stale unfulfilled
  orders, pending exports.
- Tests (per `testing/00-testing`) must cover, at minimum: the t0–t5 Context
  timeline proving no oversell after a post-sale sync; ERP restock raising
  sellable; concurrent reserve vs sync under lock; partial shipment
  settlement; idempotent double settlement; the §5b sweep repairing a
  hand-corrupted `awaiting`; cancel-settles-not-restores for ERP variants;
  `in_stock` flipping on commit; and the `021` backfill.
- Do not modify payment-provider adapters. Do not start YooKassa.

## Open Questions for Ed

**Resolved 2026-08-08 (accept defaults):**

1. **MoySklad shipped-quantity semantics.** → Verify against live API during implementation; fallback to linked `demand` / demand-link detection if per-position `shipped` is empty.
2. **Stale unfulfilled orders.** → **Alert-only** with manual clearing (no auto-settle).
3. **Relaxing the DB CHECK.** → **Yes** — drop `ck_inventory_items_on_hand_gte_reserved`; guard at locked reservation gate + drift alerting.
4. **Sequencing vs ADR-016.** → L2 (guest email) + ADR-016 outbox in the same release wave as ADR-015, **before YooKassa**. ADR-016 drafted as next `/start-feature` after this implementation.
5. **Alternative D2 timing.** → Explicit follow-up ADR after outbox exists (not only a backlog note).
6. **Manual variants.** → Keep local deduct / `restore_on_hand` for `sync_source=manual`; no plan to force-migrate them into MoySklad in this wave.

## Related

- ADR-005 — Inventory reservation and deduction (§3 deduction point,
  §5 concurrency and the CHECK this ADR relaxes)
- ADR-010 — MoySklad as ERP source of truth (§3 field ownership, §5 single
  warehouse, §6 sync strategy, §12 order export, §13 returns)
- ADR-002 — Product variants (variant = unit of sale)
- ADR-004 — YooKassa final payment integration (unaffected, must follow)
- ADR-016 (planned) — Transactional outbox for MoySklad export (prerequisite
  for Alternative D2)
- `docs/reviews/PROD-READINESS-AUDIT-2026-08-08.md` §2 L1, §3 P0-STOCK,
  §3 P1-DENORM, §5 Wave A1, §7

## Related Rules

- `integrations/00-integrations`
- `ecommerce/01-catalog`, `ecommerce/02-checkout`, `ecommerce/04-orders`
- `database/01-schema`, `database/02-migrations`, `database/03-indexing`,
  `database/04-queries`
- `architecture/01-ddd`, `architecture/02-module-boundaries`,
  `architecture/05-domain-modeling`
- `testing/00-testing`
