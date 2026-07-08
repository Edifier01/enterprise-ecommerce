# MASTER-AI-WORKFLOW.md

**Enterprise E-Commerce Platform — AI Engineering Team Reference**

Complete reference for how the AI team works: from a plain-language business goal to verified, production-ready code. Read this if you are a new developer, a new agent, or starting a new session without context.

---

## 1. System Architecture

```
User
  │
  ▼  /start-feature <goal>
start-feature skill
  │
  ├── Phase 0: Load PM State (5 files)
  ├── Phase 1: Assess goal clarity
  ├── Phase 2: Classify complexity
  │
  ▼
project-orchestrator (Opus, readonly)
  │
  ├── Reads PM state + DECISIONS.md
  ├── Creates Feature Plan
  ├── Selects agents
  │
  ▼ [User confirms plan]
subagent-orchestrator skill
  │
  ├── Round 1: Parallel specialist agents
  ├── Round 2: Sequential dependent agents
  │
  ▼
verifier (Opus, readonly)
  │
  ├── Quality Gate Checklist
  ├── ✅ PASSED / ⚠️ NOTES / ❌ FAILED
  │
  ▼
PM State Update (all 5 files)
```

**Rules** enforce what is mandatory. **Skills** describe how to do tasks. **Agents** are specialists with isolated context. **MCP** connects to external tools. **Models** are routed by task type.

---

## 2. AI Team

| Agent | Role | Model | When to use |
|-------|------|-------|-------------|
| `project-orchestrator` | Feature coordination, planning | Opus | Start of any feature |
| `enterprise-architect` | Architecture, ADRs, DDD | Opus (readonly) | New domains, architectural decisions |
| `backend-engineer` | FastAPI, use cases, repositories | Composer 2.5 | Backend implementation |
| `frontend-engineer` | Next.js, shadcn/ui, pages | Composer 2.5 | Frontend implementation |
| `database-engineer` | PostgreSQL schema, Alembic | Composer 2.5 | Schema changes, migrations |
| `api-engineer` | REST design, OpenAPI | Composer 2.5 | API design, `openapi.yaml` |
| `catalog-specialist` | Products, categories, variants | Composer 2.5 | Catalog domain |
| `checkout-specialist` | Cart, Stripe, webhooks, orders | Opus | Payments domain |
| `security-auditor` | Auth, PCI, OWASP | Opus (readonly) | Before merge of auth/payments |
| `qa-engineer` | Playwright, pytest, E2E | Composer 2.5 | Tests |
| `devops-engineer` | Docker, CI/CD, GitHub Actions | GPT-5.5 | Pipelines, deployment |
| `verifier` | Post-implementation quality gate | Opus (readonly) | After any feature |

**Total: 12 agents.** `project-orchestrator` is the coordinator. All others are specialists.

---

## 3. Model Selection

| Task type | Model | Reason |
|-----------|-------|--------|
| CRUD endpoints, UI components, tests, migrations | Composer 2.5 | Fast, cost-effective for boilerplate |
| Research, planning, documentation, comparisons | GPT-5.5 | Web search, structured output |
| Architecture, security, payments, orchestration | Opus | Deep reasoning, cross-domain analysis |

**Cost rules:**
- Opus: max 1–2 agents per mission (orchestrator + verifier)
- GPT-5.5: research and docs subagents only
- Composer 2.5: default for all implementation subagents

---

## 4. Feature Development Lifecycle

### Step 1 — Invoke
```
/start-feature <business goal>
```

### Step 2 — Context Load (automatic)
`start-feature` skill reads all 5 PM state files. No implementation starts without this.

### Step 3 — Feature Plan
`project-orchestrator` analyzes the goal and produces:
- Complexity classification (LOW / MEDIUM / HIGH)
- Domain breakdown (Frontend / Backend / Database / Testing / Security)
- Agent assignments (only what is needed)
- Execution rounds (parallel + sequential)
- Risk assessment

### Step 4 — User Confirmation
Feature Plan is shown to the user.
Implementation does **not** begin until the user explicitly confirms ("ok", "proceed", "да").

### Step 5 — Execution
`subagent-orchestrator` runs:
- Round 1: independent agents in parallel
- Round 2: dependent agents after Round 1 completes

### Step 6 — Verification
`verifier` runs the Quality Gate Checklist across 5 categories:
Architecture / Code Quality / Tests / Security / Documentation & PM State

### Step 7 — PM Update
All 5 PM state files updated. Feature marked COMPLETED in `TASKS.md`.

---

## 5. PM State Files

| File | Read when | Update when |
|------|-----------|-------------|
| `CURRENT_CONTEXT.md` | Start of every session | Active module changes |
| `HANDOFF.md` | Before any work | After any file changes |
| `TASKS.md` | Planning | Task status changes |
| `DECISIONS.md` | Architectural question | Decision made + ADR created |
| `PROJECT_STATUS.md` | Project overview | Phase or milestone progress changes |

All 5 files live in `.cursor/project-management/`.

---

## 6. Full Example: "Add Product Reviews"

### Invocation
```
/start-feature добавить систему отзывов товаров
```

### Feature Plan output
```
FEATURE PLAN
─────────────────────────────────────────
Feature: Product Reviews System
Complexity: HIGH
ADR required: YES (new domain with public write endpoint + auth dependency)

Domains affected:
  Frontend:  ProductPage component, ReviewForm, ReviewList
  Backend:   ReviewUseCase (create/list), IReviewRepository
  Database:  reviews table (product_id FK, user_id FK, rating, body, timestamps)
  Testing:   API tests (create review, list reviews, auth guard), E2E form submit
  Security:  Auth guard on POST /reviews (JWT required), PII in review body

Agent Assignment:
  database-engineer → reviews table migration + ReviewModel
  backend-engineer  → Review entity, IReviewRepository, CreateReviewUseCase, ListReviewsUseCase
  api-engineer      → POST /api/v1/products/{slug}/reviews, GET /api/v1/products/{slug}/reviews
  frontend-engineer → ReviewForm (authenticated), ReviewList, rating stars
  qa-engineer       → pytest (create, list, auth guard), Playwright (submit review flow)
  security-auditor  → auth guard check, PII in body not logged

Model Strategy:
  Opus:         orchestration, security review
  Composer 2.5: all implementation + tests

Execution:
  Round 1 (parallel): database-engineer, api-engineer
  Round 2 (sequential): backend-engineer (after DB model), frontend-engineer (after API)
  Round 3: qa-engineer, security-auditor (parallel), then verifier

Risks:
  - Auth coupling: reviews require valid JWT; test fixtures need authenticated user
  - N+1 query: listing reviews per product needs eager loading
  - PII: review body is user-generated content; do not log in plain text

Estimated effort: L
─────────────────────────────────────────
```

### DDD Structure for reviews domain
```
apps/api/app/features/reviews/
├── domain/
│   ├── entities.py      # Review dataclass
│   └── ports.py         # IReviewRepository
├── application/
│   └── use_cases/
│       ├── create_review.py
│       └── list_reviews.py
├── infrastructure/
│   └── persistence/
│       ├── models.py    # ReviewModel
│       └── repository.py
└── presentation/
    ├── router.py        # POST + GET endpoints
    └── schemas.py       # CreateReviewRequest, ReviewResponse
```

### What verifier checks
- `IReviewRepository` used in use cases (not `ReviewRepository` directly)
- Auth dependency guard on `POST /api/v1/products/{slug}/reviews`
- Migration is reversible (has `downgrade()`)
- `openapi.yaml` updated with new paths
- All 12+ backend tests green
- TypeScript: 0 errors

---

## 7. Decision Tree — Which Agent to Use

```
New feature (any domain)?
  └─ /start-feature → project-orchestrator

Architectural decision needed?
  └─ /enterprise-architect

Backend only (new endpoint, use case)?
  └─ /backend-engineer

Frontend only (new page, component)?
  └─ /frontend-engineer

Database only (schema, migration, index)?
  └─ /database-engineer

Payment / cart / Stripe / webhooks?
  └─ /checkout-specialist + /security-auditor

Auth / PCI / OWASP review?
  └─ /security-auditor

API design / openapi.yaml?
  └─ /api-engineer

Docker / CI / GitHub Actions?
  └─ /devops-engineer

Tests only?
  └─ /qa-engineer

Verify what was built?
  └─ /verifier

Not sure?
  └─ /skill-router or /start-feature
```

---

## 8. Forbidden Patterns — AI Team

| Anti-pattern | Why | Correct approach |
|-------------|-----|-----------------|
| Using Opus for CRUD boilerplate | Unnecessarily expensive | Use Composer 2.5 |
| Loading all 47 skills at once | Context overflow, reduces precision | Load 1 primary + relevant domain skill |
| Skipping `verifier` on payment features | PCI/security risk | Always run `verifier` after payments |
| Not updating PM state after work | Next agent loses context | Update all 5 files after every session |
| Creating ADR for trivial changes | Noise in decision log | ADR only for architectural changes |
| Starting code without a Feature Plan | Uncoordinated work, rework risk | Always run `project-orchestrator` first |
| Running all 12 agents on every task | Wasteful, slow | Select only needed agents |

---

## 9. Key Files Reference

| File | Purpose |
|------|---------|
| `PROJECT_BRAIN.md` | Quick context — stack, domains, constraints |
| `.cursor/project-management/CURRENT_CONTEXT.md` | 30-second agent orientation |
| `.cursor/project-management/TASKS.md` | Task registry |
| `.cursor/project-management/HANDOFF.md` | Agent-to-agent transfer |
| `.cursor/project-management/DECISIONS.md` | Decision index |
| `docs/adr/` | Full architecture decision records |
| `PROJECT_ROADMAP.md` | Strategic phases |
| `.cursor/agents/README.md` | Agent index |
| `docs/SKILL-MANIFEST.md` | Skills catalog with routing table |
| `openapi.yaml` | API contract |
| `.cursor/workflows/feature-lifecycle.md` | This workflow in detail |
| `.cursor/skills/start-feature/SKILL.md` | Entry point skill |
