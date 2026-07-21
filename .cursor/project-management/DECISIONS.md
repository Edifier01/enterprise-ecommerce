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

## ADR-006

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-006 |
| **Date** | 2026-07-09 |
| **Status** | Accepted |
| **Full ADR** | `docs/adr/ADR-006-dev-payment-stub.md` |

**Context:**

ADR-004 defers YooKassa to the final project gate. Local development and browser
smoke cannot complete checkout without Stripe keys or CLI webhook forwarding,
even though backend tests already prove the lifecycle with an in-memory gateway.

**Decision:**

- Add `StubPaymentGateway` behind existing `IStripeGateway` with
  `payment_provider=auto|stub|stripe` (auto defaults to stub without Stripe key).
- Add dev-only `POST /api/v1/dev/payments/{id}/simulate-success` that routes
  through `WebhookService` (preserves ADR-003 order invariant).
- Frontend `NEXT_PUBLIC_PAYMENT_MODE=auto|stub|stripe` shows test payment UI
  when stub mode is active.
- Hard-gate stub from production (`payment_provider=stub` fails fast; simulate
  endpoint returns 404).

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| Synchronous order on payment intent | Violates ADR-003 webhook invariant |
| Require Stripe test keys for dev | Validates provider being replaced per ADR-004 |

**Consequences:**

- Positive: full cart→order flow works locally without provider credentials.
- Negative: stub does not validate real provider signatures; Stripe naming persists
  until YooKassa sprint.

**Related Rules:**

- `ecommerce/02-checkout`
- `ecommerce/03-payments`
- `security/02-pci`

---

## ADR-007

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-007 |
| **Date** | 2026-07-09 |
| **Status** | Accepted |
| **Full ADR** | `docs/adr/ADR-007-admin-panel-architecture.md` |

**Context:**

Phase 24 storefront is complete for customers. Operations need a separate backoffice
without sharing customer credentials or JWT scope. Sprint A establishes admin
identity, RBAC, layout shell, and read-only dashboard.

**Decision:**

- Separate `admin_users` table and `AdminUser` entity (not roles on `users`).
- Admin JWT with `scope: admin` and `permissions` claim; `AdminJwtTokenService`.
- API namespace `/api/v1/admin/*`; RBAC `require_permission()` default-deny.
- Frontend `/admin/*` route group with separate `admin_access_token` cookie.
- Sprint A endpoints: login, me, dashboard summary. MFA deferred to production gate.

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| Roles on existing `users` table | Risk of customer account elevation; violates separation |
| Shared JWT between customer and admin | Scope confusion; security boundary violation |
| MFA in Sprint A | Blocks delivery; documented hook for production |

**Consequences:**

- Positive: clear security boundary; foundation for Sprints B–D (catalog, inventory, orders admin).
- Negative: duplicate auth infrastructure; MFA still required before production admin use.

**Related Rules:**

- `ecommerce/00-ecommerce`
- `security/01-auth`
- `frontend/03-routing`

---

## ADR-008

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-008 |
| **Date** | 2026-07-10 |
| **Status** | Accepted |
| **Full ADR** | `docs/adr/ADR-008-wholesale-retail-pricing.md` |

**Context:**

Business requires retail and wholesale prices per sellable SKU. Wholesalers (admin-assigned,
permanent status) see both prices and purchase at wholesale; retail customers see and pay
retail only. Checkout already prices at variant level (ADR-002).

**Decision:**

- `product_variants.price_cents` = retail; add `wholesale_price_cents` with
  `wholesale <= retail` CHECK.
- `users.is_wholesaler` flag; admin-only grant/revoke (`customers:write`).
- Server-side `resolve_unit_price_cents`; wholesale omitted from public API for non-wholesalers.
- Order snapshots immutable; `price_tier` recorded on lines.
- Delivered as **Sprint E**, before YooKassa final gate.

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| Product-level wholesale only | Checkout uses variant price |
| Wholesale visible to all | Violates requirement |
| Recalculate past orders on status change | Violates requirement |

**Consequences:**

- Positive: B2B/B2C separation; aligns with variant-first checkout.
- Negative: catalog, cart, checkout, admin customers UI, OpenAPI all need coordinated update.

**Related Rules:**

- `ecommerce/01-catalog`, `ecommerce/02-checkout`, `ecommerce/04-orders`
- `database/01-schema`, `database/02-migrations`
- ADR-002, ADR-007

---

## ADR-009

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-009 |
| **Date** | 2026-07-16 |
| **Status** | Accepted |
| **Full ADR** | `docs/adr/ADR-009-product-content-and-homepage-collections.md` |

**Context:** Homepage SectionTabs used client-side mock filtering; products lacked description/image fields; categories had no product counts.

**Decision:** Add `products.description` + `products.image_url`; homepage collections reuse list API filters; categories expose `product_count`.

**Related Rules:** `ecommerce/01-catalog`, ADR-002

---

## ADR-010

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-010 |
| **Date** | 2026-07-19 |
| **Status** | Accepted |
| **Full ADR** | `docs/adr/ADR-010-moysklad-erp-integration.md` |

**Context:**

Business maintains SKU, prices, stock, and product modifications (size/color) in
МойСклад. The site must display merchandised content (photos, names, SEO,
categories) editable in admin while operational data syncs unidirectionally from MS.

**Decision:**

- Overlay pattern: MS owns ERP snapshot; site owns display layer.
- New bounded context `integrations/moysklad` with ACL (JSON API 1.2).
- Single warehouse via `MOYSKLAD_STORE_ID`.
- Webhooks + cron fallback; webhooks off until initial import.
- Phased delivery: foundation → catalog import → stock → display/SEO → order export.
- Admin API rejects edits to MS-owned fields when `sync_source=moysklad`.

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| MS as sole source (no overlay) | Cannot customize storefront display/SEO |
| Bidirectional price/stock edit | Conflicts with requirement; complex resolution |
| Webhooks only (no cron) | Missed events cause catalog drift |

**Consequences:**

- Positive: clear field ownership; reuses ADR-005 inventory/checkout; phased rollout.
- Negative: admin UX complexity; order export required for long-term MS stock parity.

**Related Rules:**

- `integrations/00-integrations.mdc`
- `architecture/01-ddd`, `architecture/02-module-boundaries`
- ADR-002, ADR-005, ADR-007, ADR-008, ADR-009

---

## ADR-011

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-011 |
| **Date** | 2026-07-19 |
| **Status** | Accepted |
| **Full ADR** | `docs/adr/ADR-011-variant-selector-ux.md` |

**Context:**

Storefront PDP used a flat variant name list. Professional e-commerce uses color
swatches, size pills, dependent availability, and color-tagged gallery images.

**Decision:**

- Server-derived `option_groups` on public product API (`variant_options.py`)
- Nullable `product_images.option_color` for site-owned gallery overlay
- Frontend `VariantSelector` with structured/fallback modes; PLP color dots + «От X ₽»

**Related Rules:**

- ADR-002, ADR-010
- `ecommerce/01-catalog`

---

## ADR-012

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-012 |
| **Date** | 2026-07-19 |
| **Status** | Accepted |
| **Full ADR** | `docs/adr/ADR-012-admin-panel-ia.md` |

**Context:**

Admin Wave 1 improved quick wins; operators still need grouped nav, dashboard
action alerts, read-only MS inventory UI, and save-without-redirect on product edit.

**Decision:**

- Grouped sidebar: Витрина / МойСклад / Операции; categories as dedicated link
- Dashboard «Требует внимания» from existing MoySklad status counts
- `sync_source` on admin inventory list; hide adjust for MS SKUs
- Product save: «Сохранить» stays on page + toast; «Сохранить и закрыть» redirects

**Related Rules:**

- ADR-007, ADR-010
- `apps/web/src/lib/admin/navigation.ts`

---

## ADR-013

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-013 |
| **Date** | 2026-07-21 |
| **Status** | Accepted |
| **Full ADR** | `docs/adr/ADR-013-local-server-media-storage.md` |

**Context:**

Production media used S3 + CDN with presigned uploads. Deployment is a single VPS;
object storage adds cost and complexity without current scale need.

**Decision:**

Local filesystem on API server with Docker volume; public URLs via
`MEDIA_PUBLIC_BASE_URL` and Caddy `/media/*` proxy. S3 backend removed.

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|
| Keep S3 in production | Explicit user requirement for on-server storage |
| PostgreSQL blob storage | Poor fit for image delivery |

**Consequences:**

- Positive: simpler ops, no S3 credentials
- Negative: disk backup and capacity are operator responsibilities

**Related Rules:**

- `docker/00-docker.mdc`
- ADR-009

---

## ADR-014

| Field | Value |
|-------|-------|
| **Decision ID** | ADR-014 |
| **Date** | 2026-07-21 |
| **Status** | Accepted |
| **Full ADR** | `docs/adr/ADR-014-remove-admin-mfa.md` |

**Context:**

Admin TOTP MFA added operational friction. Small-team VPS deployment does not require MFA.

**Decision:**

Remove admin MFA entirely. Login returns JWT after email+password. Migration 018 drops MFA columns.

**Consequences:**

- Positive: simpler ops and login
- Negative: password-only admin auth — enforce strong secrets and HTTPS

**Related Rules:**

- ADR-007 (MFA deferred — path removed)
- `security/01-auth`

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
