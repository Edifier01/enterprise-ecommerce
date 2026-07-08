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
| **Status** | Approved |
| **Full ADR** | N/A (operational decision) |

**Context:**

The 11 specialist agents lacked a coordination layer. Users had to manually decompose features, select agents, and manage execution order. The `subagent-orchestrator` skill handled parallel execution but required the user to do the task breakdown themselves. There was no agent that accepted a business goal and autonomously routed it through the full development lifecycle.

**Decision:**

Add a Project Orchestrator pattern:
- `project-orchestrator` agent (Opus, readonly) — receives business goals, produces Feature Plans, assigns agents, manages lifecycle
- `start-feature` skill — unified `/start-feature <goal>` entry point that routes through context load → orchestrator → feature lifecycle → verifier
- `feature-lifecycle` workflow (`.cursor/workflows/`) — 12-phase universal lifecycle for any feature
- `11-planning-first` rule — mandatory planning gate before code

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
