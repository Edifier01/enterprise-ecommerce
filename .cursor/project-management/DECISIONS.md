# Decisions

> Lightweight decision registry for agents. Complements full ADRs in `docs/adr/`.
> For new architectural decisions: create ADR in `docs/adr/`, then add entry here.

---

## ADR-001

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-001 |
| **Date** | 2026-07-07 |
| **Status** | Approved |
| **Full ADR** | `docs/adr/ADR-001-monorepo-structure.md` |

**Context:**

AI development platform is complete. Application code requires a monorepo aligned with feature-first architecture (FastAPI + Next.js + PostgreSQL).

**Decision:**

Use modular monolith monorepo:

- `apps/api/` — FastAPI backend
- `apps/web/` — Next.js App Router storefront
- `openapi.yaml` at repo root (contract-first)
- `docker-compose.yml` for local PostgreSQL

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| Separate repos for API and web | Breaks single source of truth for AI platform + app |
| Microservices from start | Over-engineering for current scale; modular monolith allows evolution |

**Consequences:**

- Positive: Single repo for rules + application; OpenAPI MCP works out of box
- Negative: Repo grows; may need `.cursorignore` for `node_modules`

**Related Rules:**

- `architecture/04-folder-structure.mdc`
- `architecture/06-adr.mdc`

---

## ADR-002

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-002 |
| **Date** | 2026-07-08 |
| **Status** | Accepted |
| **Full ADR** | `docs/adr/ADR-002-product-variants-and-pricing.md` |

**Context:**

Sprint 8 extends the catalog with product variants (purchasable SKUs), sale
pricing display, and a real product↔category association to replace the former
`assignCategorySlug` frontend mock.

**Decision:**

- `ProductVariant` as a child entity of the `Product` aggregate (loaded on the
  detail path via `get_by_slug`; not a standalone aggregate/repository yet).
- Single-currency pricing (catalog Option 1) + nullable `compare_at_price_cents`
  with the invariant `compare_at_price_cents > price_cents` enforced in both the
  domain entity and a DB CHECK constraint.
- Primary-category FK on `products` (`category_id` → `categories.id`,
  `ON DELETE SET NULL`); full many-to-many deferred. `GET /api/v1/products`
  gains an optional `category` slug filter.

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| ProductVariant as independent aggregate + repository | Over-engineering; no cart/order flow consumes variants directly yet |
| Per-currency price table / exchange conversion | No multi-currency requirement today |
| Many-to-many product↔category now | Current UX needs only a primary category; M2M can be added later |

**Consequences:**

- Positive: storefront shows real variants + sale prices; category filtering uses
  real associations; migration is additive and reversible.
- Negative: pre-migration products have `category_id = NULL` and no variants until
  seeded; primary-FK → M2M later needs a follow-up migration + ADR.

**Related Rules:**

- `ecommerce/01-catalog`
- `database/01-schema`
- `architecture/05-domain-modeling`

---

## ADR-003

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-003 |
| **Date** | 2026-07-09 |
| **Status** | Superseded for final payment provider by ADR-004 |
| **Full ADR** | `docs/adr/ADR-003-stripe-checkout-payments.md` |

**Context:**

Sprint 9 adds cart, checkout, Stripe PaymentIntent processing, webhooks, and
order creation. This touches payments, persistence, and PCI scope. Stripe is now
historical foundation/prototype work; ADR-004 selects YooKassa as the final
payment provider.

**Decision:**

- Use Stripe PaymentIntents with Stripe Payment Element to maintain SAQ A scope.
- Support guest carts and authenticated carts; merge guest cart into user cart
  idempotently after login.
- Create `Order` only after verified `payment_intent.succeeded` webhook.
- Deduplicate payment and order side effects with idempotency keys, Stripe event
  IDs, and one order per checkout session.
- Defer inventory reservation/deduction to a later sprint; Sprint 9 validates
  current purchasability and records immutable order/payment snapshots.

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| Stripe-hosted Checkout Session | Less control over the internal checkout/order state model |
| Create orders before payment success | Produces unpaid commercial records and conflicts with payment rules |
| Include inventory reservation now | Requires quantity/reservation model not yet present in catalog |

**Consequences:**

- Positive: PCI scope remains narrow, retries are idempotent, and order creation
  depends on trusted webhook confirmation.
- Negative: frontend success may briefly show pending confirmation; inventory
  contention is not fully solved until a later sprint.

**Related Rules:**

- `ecommerce/02-checkout`
- `ecommerce/03-payments`
- `ecommerce/04-orders`
- `security/02-pci`

---

## ADR-004

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-004 |
| **Date** | 2026-07-09 |
| **Status** | Accepted |
| **Full ADR** | `docs/adr/ADR-004-yookassa-final-payment-integration.md` |

**Context:**

Sprint 9 checkout foundation is complete, but Stripe payment-system setup and
full Payment Element smoke are no longer part of current validation. The project
will use YooKassa as the final payment provider.

**Decision:**

- Use YooKassa as the final project payment integration.
- Move payment-provider implementation and full browser payment smoke to the
  final project release gate.
- Preserve the checkout/order invariant: create `Order` only after verified
  provider notification confirms successful payment.
- Treat existing Stripe code as temporary Sprint 9 foundation/prototype work to
  be replaced or refactored during the final payment sprint.

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| Continue Stripe validation now | Validates a provider that will not be final |
| Replace Stripe immediately | Disrupts current roadmap before remaining commerce foundation is ready |

**Consequences:**

- Positive: current work is unblocked and final payment work aligns with the
  target provider.
- Negative: Stripe-specific code/config/tests remain temporarily and must be
  migrated deliberately in the final payment sprint.

**Related Rules:**

- `ecommerce/02-checkout`
- `ecommerce/03-payments`
- `ecommerce/04-orders`
- `security/02-pci`

---

## ADR-005

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-005 |
| **Date** | 2026-07-09 |
| **Status** | Accepted |
| **Full ADR** | `docs/adr/ADR-005-inventory-reservation-and-deduction.md` |

**Context:**

Sprint 10 adds the Inventory bounded context deferred by ADR-003. The catalog
only had a boolean `in_stock`; there was no quantity model, reservation model, or
oversell protection. Reservation/deduction must layer onto the existing checkout
lifecycle without breaking its invariants or the YooKassa migration (ADR-004).

**Decision:**

- Introduce an Inventory context (`inventory_items`, `inventory_reservations`)
  with `InventoryItem` as aggregate root, keyed one-to-one to catalog
  `product_variants.id`; checkout depends on it via a port, correlating
  reservations to a checkout session by value (no cross-context FK).
- Reserve at checkout session creation/revalidation (not at add-to-cart); deduct
  exactly once inside the confirmed order-creation transaction; release on
  payment failure/cancel, explicit cancel, and TTL expiry sweep.
- Concurrency: pessimistic `SELECT ... FOR UPDATE` row lock as primary guard,
  backed by a `version` optimistic guard and DB CHECK
  `quantity_on_hand >= quantity_reserved`; deterministic lock ordering.
- Idempotency: one active reservation set per checkout session; reuse existing
  order-per-session + webhook event-ID dedup so retries cannot double
  reserve/deduct/release.

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| Reserve at add-to-cart | Long-lived/abandoned carts strand stock and cause false out-of-stock |
| Deduct at reservation | Deducts unpaid stock; forces re-crediting on every abandonment |
| Optimistic version-only concurrency | Retry storms/starvation on hot variants; kept only as secondary guard |
| Distributed (Redis) lock | Unnecessary infra/failure mode for a single PostgreSQL primary |

**Consequences:**

- Positive: oversell prevented under concurrency; holds are short-lived and
  released deterministically; deduction is exactly-once and provider-neutral, so
  the YooKassa migration is unaffected.
- Negative: extra locked write path on checkout; possible out-of-stock at checkout
  after add-to-cart; requires a reliable TTL-expiry sweep and variant backfill.

**Related Rules:**

- `ecommerce/02-checkout`
- `ecommerce/04-orders`
- `database/01-schema`, `database/02-migrations`, `database/03-indexing`
- `architecture/01-ddd`, `architecture/02-module-boundaries`
- `testing/00-testing`

---

## PM-001

| Field | Value |
|-------|-------|
| **Decision ID** | PM-001 |
| **Date** | 2026-07-07 |
| **Status** | Approved |
| **Full ADR** | N/A (operational decision) |

**Context:**

Agents lacked persistent coordination — no single place for current state, tasks, handoffs, or quick decision lookup between sessions.

**Decision:**

Create `.cursor/project-management/` with five state files (PROJECT_STATUS, TASKS, DECISIONS, HANDOFF, CURRENT_CONTEXT) as the operational source of truth for agent coordination. Full ADRs remain in `docs/adr/`.

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| Extend PROJECT_ROADMAP.md only | Roadmap is strategic; lacks task status, handoffs, active context |
| Memory MCP only | Good for conventions, not structured task/state/handoff workflow |
| Simple TODO list | Insufficient for multi-agent coordination and architectural traceability |

**Consequences:**

- Positive: Agents can resume work with full context; decisions and tasks are traceable
- Negative: Requires discipline to update files after every session

**Related Rules:**

- `core/05-context-loading.mdc`
- `core/10-project-state-management.mdc`

---

## AI-001

| Field | Value |
|-------|-------|
| **Decision ID** | AI-001 |
| **Date** | 2026-07-08 |
| **Status** | Approved (model routing superseded by AI-002) |
| **Full ADR** | N/A (operational decision) |

**Context:**

The 11 specialist agents lacked a coordination layer. Users had to manually decompose features, select agents, and manage execution order. The `subagent-orchestrator` skill handled parallel execution but required the user to do the task breakdown themselves. There was no agent that accepted a business goal and autonomously routed it through the full development lifecycle.

**Decision:**

Add a Project Orchestrator pattern:
- `project-orchestrator` agent (readonly) — receives business goals, produces Feature Plans, assigns agents, manages lifecycle
- `start-feature` skill — unified `/start-feature <goal>` entry point that routes through context load → orchestrator → feature lifecycle → verifier
- `feature-lifecycle` workflow (`.cursor/workflows/`) — 12-phase universal lifecycle for any feature
- `11-planning-first` rule — mandatory planning gate before code

> **Note:** AI-001 originally assigned Opus to `project-orchestrator`. **AI-002**
> changed the default model to GPT-5.5; the orchestrator pattern itself is unchanged.

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| Extend `subagent-orchestrator` to also plan | Different concern: orchestrator plans, subagent-orchestrator executes; mixing them creates a god-skill |
| New hook for `/start-feature` | Hook would fire on every session start; start-feature is invoked explicitly per feature |

**Consequences:**

- Positive: Any business goal can be routed to the right agents automatically; coordination is explicit and reviewable
- Negative: Small tasks should bypass orchestrator (TRIVIAL classification in start-feature handles this)

**Related Rules:**

- `core/10-project-state-management.mdc`
- `core/11-planning-first.mdc`
- `workflow/00-workflow.mdc`

---

## AI-002

| Field | Value |
|-------|-------|
| **Decision ID** | AI-002 |
| **Date** | 2026-07-08 |
| **Status** | Approved |
| **Full ADR** | N/A (operational decision) |

**Context:**

Opus is the most expensive model. Audit of the agent roster found Opus assigned to
5 of 12 agents, including `project-orchestrator` and `verifier` — which run on
**every** feature via `/start-feature` regardless of complexity. This made Opus
touch nearly every workflow (even TRIVIAL/STANDARD), driving avoidable cost.

**Decision:**

Reserve Opus for genuinely complex / high-stakes agents only, and default
per-feature coordination and validation to cheaper models:

- `verifier` → **Composer 2.5** (quality gate is a deterministic checklist + test runs)
- `project-orchestrator` → **GPT-5.5** (planning & routing, not deep reasoning)
- Opus retained for `enterprise-architect` (COMPLEX/ADR), `security-auditor`
  (auth/PCI), `checkout-specialist` (payments)
- COMPLEX features route deep design/ADR to `enterprise-architect` (Opus) instead
  of escalating orchestration; `verifier` escalates to Opus only on a real
  architectural/security/PCI concern.

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| Keep Opus everywhere | Too expensive; Opus ran on every feature via orchestrator + verifier |
| Move everything to Composer 2.5 (incl. security/payments) | Would lower quality on high-stakes work; unacceptable per `core/00-core` |
| Introduce a Sonnet middle tier for verify/orchestrate | Deferred; Composer 2.5 + GPT-5.5 sufficient today, revisit if quality drops |

**Consequences:**

- Positive: Opus no longer triggered on routine per-feature cycles; significant
  token savings while high-stakes reasoning is preserved.
- Negative: routine verification/planning has less reasoning depth — mitigated by
  explicit escalation-on-evidence and COMPLEX→architect routing.

**Related Rules:**

- `core/08-model-routing.mdc`
- `ai/00-ai.mdc`

---

## Decision Log Template

Use when recording new decisions:

```
## ADR-NNN or PM-NNN

| Field | Value |
|-------|-------|
| **Decision ID** | |
| **Date** | YYYY-MM-DD |
| **Status** | Proposed / Approved / Deprecated / Superseded |
| **Full ADR** | `docs/adr/ADR-NNN-title.md` or N/A |

**Context:**

**Decision:**

**Alternatives Considered:**

**Consequences:**

**Related Rules:**
```
