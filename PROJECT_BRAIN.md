# PROJECT_BRAIN.md

> Quick context layer for any agent or new developer.
> Not a replacement for `TASKS.md`, `HANDOFF.md`, or `docs/adr/`.
> For operational state → `.cursor/project-management/`. For architecture → `docs/adr/`.

---

## 1. What this is

Enterprise e-commerce platform + AI Development Platform in one repository.

Two-layer system:

| Layer | Path | Purpose |
|-------|------|---------|
| **AI Platform** | `.cursor/` | 73 rules, 47 skills, 12 agents, 10 MCP servers, PM state |
| **Application** | `apps/` | The actual store: storefront + API + database |

Cursor reads `.cursor/` and behaves as a team of AI specialists with shared standards, not as "one chat with no memory".

---

## 2. Tech Stack

| Layer | Technology | Path |
|-------|-----------|------|
| Frontend | Next.js 15 App Router + Tailwind v4 + shadcn/ui | `apps/web/` |
| Backend | FastAPI + SQLAlchemy 2.0 async + Alembic | `apps/api/` |
| Database | PostgreSQL 16 | `docker-compose.yml` |
| Payments | Stripe (planned) | — |
| API Contract | OpenAPI 3.1 | `openapi.yaml` |
| Python | 3.13 | `apps/api/` |
| Node | 24 | `apps/web/` |

---

## 3. Architectural Principles

- **DDD (Domain-Driven Design)** — each domain has 4 layers:
  `domain/` → `application/` → `infrastructure/` → `presentation/`
- **Clean Architecture** — dependencies point inward; no infrastructure imports in domain
- **Feature-First Organization** — `apps/api/app/features/<domain>/`
- **Contract-First API** — `openapi.yaml` at repo root is the source of truth
- **Dependency Inversion** — use cases depend on `IRepository` interfaces, not concrete classes

---

## 4. Current Phase

- **Phase 24 — Internet Store** (~55%)
- **AI Platform (Phases 0–23, 25):** 100% complete
- **Sprints completed:** Sprint 1 (Architecture Hardening) + Sprint 2 (Quality Baseline) + Sprint 3 (CI/CD + Auth + E2E)

---

## 5. Implemented Domains

| Domain | Backend | Frontend |
|--------|---------|----------|
| catalog | `Product` entity, `GET /api/v1/products`, `GET /api/v1/products/{slug}` | Product grid, product detail page `/products/[slug]` |
| auth | `User` entity, `POST /api/v1/auth/register`, `POST /api/v1/auth/login` (JWT) | Not yet (Sprint 4 frontend) |

---

## 6. Domain Structure (catalog example)

```
apps/api/app/features/catalog/
├── domain/
│   ├── entities.py      # Product dataclass (frozen, slots)
│   └── ports.py         # IProductRepository (ABC)
├── application/
│   └── use_cases/
│       ├── list_products.py  # ListProductsUseCase(IProductRepository)
│       └── get_product.py    # GetProductUseCase(IProductRepository)
├── infrastructure/
│   └── persistence/
│       ├── models.py    # ProductModel(Base) — SQLAlchemy async
│       └── repository.py # ProductRepository(IProductRepository)
└── presentation/
    ├── router.py        # FastAPI routes + Depends() DI
    └── schemas.py       # Pydantic schemas (from_attributes=True)
```

Every new domain MUST follow this exact structure.

---

## 7. Key Architectural Decisions

| ID | Decision | Details |
|----|----------|---------|
| ADR-001 | Monorepo structure | `apps/api` + `apps/web` + `openapi.yaml` at root |
| PM-001 | `.cursor/project-management/` as operational source of truth | 5 PM state files |
| AI-001 | Project Orchestrator pattern | `project-orchestrator` (Opus, readonly) + `start-feature` skill entry point |
| — | Money as integer cents | `price_cents: int` — never `float` |
| — | DI via FastAPI `Depends()` | `IRepository` injected into use cases via router |
| — | Async SQLAlchemy only | No synchronous DB calls |

---

## 8. Forbidden Patterns

| Pattern | Correct alternative |
|---------|-------------------|
| `float` for money | `int` cents (`price_cents: int`) |
| Concrete class in use case | `IRepository` interface only |
| Synchronous SQLAlchemy | `async` session only |
| Direct SQL bypassing repository | Only via `IRepository` |
| Secrets in code | `env vars` + `app/core/config.py` |
| `alwaysApply: true` for domain rules | Only for `core/*` rules |
| `asdict()` for Pydantic | `from_attributes=True` + `model_validate()` |
| `import *` | Explicit imports only |
| Circular imports between DDD layers | Depend inward only |

---

## 9. How to Start a Feature

```
/start-feature <business goal>
```

This triggers: Context Load → Feature Plan → Agent Assignment → Implementation → Verification.

For the full workflow: `docs/MASTER-AI-WORKFLOW.md`.

---

## 10. Key Files

| What | Path |
|------|------|
| Current context (30s read) | `.cursor/project-management/CURRENT_CONTEXT.md` |
| Tasks registry | `.cursor/project-management/TASKS.md` |
| Agent handoff | `.cursor/project-management/HANDOFF.md` |
| Decision index | `.cursor/project-management/DECISIONS.md` |
| Full ADRs | `docs/adr/` |
| Strategic roadmap | `PROJECT_ROADMAP.md` |
| AI team reference | `docs/MASTER-AI-WORKFLOW.md` |
| Agents index | `.cursor/agents/README.md` |
| Skills catalog | `docs/SKILL-MANIFEST.md` |
| API contract | `openapi.yaml` |
| Platform guide | `docs/GUIDE.md` |
