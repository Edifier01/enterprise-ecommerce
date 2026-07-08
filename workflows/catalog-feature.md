# Catalog Feature Workflow

---

## Workflow Name

Catalog Feature Implementation

---

## Purpose

Implement or extend catalog domain features (products, categories, variants) in the monorepo following DDD, OpenAPI contract, and e-commerce rules.

---

## Trigger

- New catalog API endpoint or entity
- Category hierarchy or product variant work
- Storefront catalog page changes
- OpenAPI catalog schema updates

---

## Participants

| Role | Agent | Model | Skills |
|------|-------|-------|--------|
| Lead | catalog-specialist | Composer 2.5 | implement-catalog-feature |
| Backend | backend-engineer | Composer 2.5 | python-fastapi-development, fastapi-pro, postgresql |
| Frontend | frontend-engineer | Composer 2.5 | shadcn, react-nextjs-development |
| Database | database-engineer | Composer 2.5 | postgresql, postgresql-optimization |
| API contract | api-engineer | Composer 2.5 | openapi-spec-generator |
| Validation | verifier | Opus | — |

---

## Phases

### Phase 1 — Analysis

**Input:** TASKS.md item, OpenAPI spec, related rules (`ecommerce/01-catalog`, `architecture/01-ddd`)

**Output:** Scope note — entities, endpoints, migrations, UI surfaces

**Checklist:**

- [ ] Read `.cursor/project-management/CURRENT_CONTEXT.md`
- [ ] Confirm feature path: `apps/api/app/features/catalog/`, `apps/web/src/features/catalog/` (when created)
- [ ] Check ADRs and DECISIONS.md for constraints

### Phase 2 — Planning

**Input:** Analysis output

**Output:** Layer plan (domain → application → infrastructure → presentation)

**Checklist:**

- [ ] Update OpenAPI if contract changes
- [ ] Plan Alembic migration if schema changes
- [ ] Identify pytest coverage needed

### Phase 3 — Implementation

**Input:** Approved plan

**Output:** Working API + tests + frontend wiring

**Checklist:**

- [ ] Domain entities in `domain/`
- [ ] Use cases in `application/use_cases/`
- [ ] Repository + models in `infrastructure/persistence/`
- [ ] Router + schemas in `presentation/`
- [ ] Register router in `app/main.py`
- [ ] Frontend API client in `apps/web/src/lib/api.ts`

### Phase 4 — Validation

**Input:** Implementation

**Output:** Passing tests, `/verifier` sign-off

**Checklist:**

- [ ] `pytest` in `apps/api/tests/`
- [ ] Manual check: API returns expected JSON
- [ ] Storefront renders data or graceful empty state

### Phase 5 — Documentation

**Input:** Validated implementation

**Output:** Updated PM state and OpenAPI

**Checklist:**

- [ ] Update TASKS.md, PROJECT_STATUS.md, HANDOFF.md, CURRENT_CONTEXT.md
- [ ] Sync OpenAPI if endpoints changed
- [ ] Add ADR entry to DECISIONS.md if architectural decision made

---

## Escalation Rules

- Cross-domain impact (inventory, pricing) → invoke `enterprise-architect`
- Schema performance concerns → invoke `database-engineer`
- Security-sensitive catalog fields → invoke `security-auditor`

---

## Related Rules

- `ecommerce/01-catalog.mdc`
- `architecture/01-ddd.mdc`, `architecture/04-folder-structure.mdc`
- `backend/*`, `api/*`, `database/*`

---

## Related Workflows

- `checkout-feature.md` — when catalog links to cart
- `session-handoff.md` — session start/stop protocol

---

## Summary

Standard path for catalog work: analyze → plan layers → implement DDD feature module → test → update PM state and OpenAPI.
