# Tasks

> Master task registry for epics, features, technical work, bugs, and improvements.
> Statuses: `BACKLOG` · `PLANNED` · `IN_PROGRESS` · `REVIEW` · `COMPLETED` · `BLOCKED`

---

## Epic: AI Development Platform

**Status:** COMPLETED

### Phase 0–23 Platform Build

- [x] Core Rules (Phase 1)
- [x] Architecture Rules (Phase 2)
- [x] Templates (Phase 3)
- [x] Backend, Frontend, Database, API Rules (Phases 4–7)
- [x] E-Commerce, Security, Testing, Performance Rules (Phases 8–11)
- [x] Documentation, Workflow, AI, Docker, Git, Integration Rules (Phases 12–17)
- [x] Skills — 46 skills (Phase 18)
- [x] Agents — 11 specialists (Phase 19)
- [x] Memory MCP + docs/MEMORY.md (Phase 20)
- [x] MCP configuration — 10 servers (Phase 21)
- [x] Architecture Review (Phase 22)
- [x] Enterprise Review (Phase 23)

---

## Epic: Project Management Layer

**Status:** COMPLETED

### Feature: Agent Coordination System

- [x] Create `.cursor/project-management/` directory
- [x] PROJECT_STATUS.md — current state snapshot
- [x] TASKS.md — master task registry
- [x] DECISIONS.md — decision index
- [x] HANDOFF.md — agent-to-agent transfer
- [x] CURRENT_CONTEXT.md — 30-second overview
- [x] Update context-loading skill with mandatory init workflow
- [x] Create project-management template
- [x] Create project-state-management rule

---

## Epic: E-Commerce Application (Phase 24)

**Status:** IN_PROGRESS

### Feature: Monorepo Scaffold

**Status:** COMPLETED

- [x] Create `apps/api/` FastAPI structure
- [x] Create `apps/web/` Next.js App Router structure
- [x] Add `docker-compose.yml` for PostgreSQL
- [x] Add root `openapi.yaml`
- [x] Add `.env.example`
- [x] ADR-001 monorepo structure

### Sprint 1 — Architecture Hardening

**Status:** COMPLETED (2026-07-08)

- [x] `__init__.py` in all Python packages
- [x] `IProductRepository` interface (`domain/ports.py`)
- [x] `ProductRepository` inherits interface
- [x] `ListProductsUseCase` depends on interface (DIP)
- [x] Router: proper `Depends()` DI chain
- [x] `ProductSchema`: `ConfigDict(from_attributes=True)`, removed `asdict()`
- [x] `main.py`: lifespan manager, docs off in production
- [x] `conftest.py`: CI-safe SQLite base client
- [x] Edge case tests: empty DB, page=0→422, limit=101→422
- [x] All 6 tests green

- [x] Product aggregate and repository
- [x] Catalog API `GET /api/v1/products` per OpenAPI
- [x] Storefront product listing page
- [x] Category hierarchy (Sprint 7 — see below)
- [x] Product variants and pricing display (Sprint 8 — see below)

### Sprint 2 — Quality Baseline

**Status:** COMPLETED (2026-07-08)

- [x] Migration 002: `updated_at` + `price_cents >= 0` check constraint
- [x] `ProductModel` updated with `updated_at`, `CheckConstraint`
- [x] `app/core/errors.py`: centralised exception handlers (HTTP/422/500)
- [x] `main.py`: exception handlers registered, unhandled exceptions logged
- [x] `scripts/seed_dev.py`: idempotent seed — 8 sample products
- [x] `loading.tsx`: App Router skeleton with shadcn Card components
- [x] `openapi.yaml`: `in_stock` added to `required` array
- [x] `shadcn/ui` v4.13.0 initialised (Tailwind v4, Card + Badge + Button)
- [x] `page.tsx`: upgraded to shadcn Card/Badge, 3-column grid
- [x] TypeScript: 0 errors (`tsc --noEmit`)
- [x] Backend: 8/8 tests green

### Sprint 3 — CI/CD + Auth + E2E

**Status:** COMPLETED (2026-07-08)

- [x] `.github/workflows/ci.yml`: parallel backend (Python 3.13) + frontend (Node 24) jobs
- [x] Docker healthcheck for PostgreSQL in `docker-compose.yml`
- [x] `pytest.ini`: `pythonpath = .` for correct module resolution in CI
- [x] Auth domain (DDD): `User` entity, `IUserRepository`, `RegisterUserUseCase`, `LoginUserUseCase`
- [x] Auth infrastructure: `UserModel` (SQLAlchemy), `UserRepository`
- [x] Auth presentation: `POST /api/v1/auth/register` (201) + `POST /api/v1/auth/login` (200 + JWT)
- [x] Auth schemas: `RegisterRequest`, `LoginRequest`, `RegisterResponse`, `TokenResponse`
- [x] Migration 003: `users` table (UUID PK, email UNIQUE, hashed_password, is_active, timestamps)
- [x] `tests/test_auth.py`: 4 tests — register success, duplicate email (409), login success, wrong password (401)
- [x] `IProductRepository.get_by_slug()` + `ProductRepository` implementation
- [x] `GetProductUseCase` + `GET /api/v1/products/{slug}` endpoint (404 on miss)
- [x] `apps/web/src/app/products/[slug]/page.tsx`: Server Component product detail page
- [x] Homepage product cards wrapped in `<Link>` → `/products/{slug}`
- [x] Playwright: `@playwright/test` installed, `playwright.config.ts`, `e2e/homepage.spec.ts`
- [x] `openapi.yaml`: added `/api/v1/products/{slug}`, `/api/v1/auth/register`, `/api/v1/auth/login`
- [x] All 12 backend tests green (`pytest 12/12`)
- [x] TypeScript: 0 errors (`tsc --noEmit`)

### Sprint 4 — AI Orchestration Upgrade

**Status:** COMPLETED (2026-07-08)

- [x] `.cursor/rules/core/11-planning-first.mdc` — mandatory planning gate before implementation
- [x] `.cursor/agents/project-orchestrator.md` — main feature coordinator (Opus, readonly)
- [x] `.cursor/workflows/feature-lifecycle.md` — 12-phase universal feature lifecycle workflow
- [x] `.cursor/skills/start-feature/SKILL.md` — `/start-feature` unified entry point
- [x] `PROJECT_BRAIN.md` — quick context layer at repo root
- [x] `docs/MASTER-AI-WORKFLOW.md` — full AI team reference document
- [x] `.cursor/agents/verifier.md` — Quality Gate Checklist added
- [x] `docs/SKILL-MANIFEST.md` — `start-feature` added to native skills table and routing table
- [x] `docs/GUIDE.md` — section 5.1 added; `project-orchestrator` in agent table
- [x] `DECISIONS.md` — AI-001 entry added
- [x] All 12 backend tests still green
- [x] TypeScript: 0 errors

### Sprint 5 — Auth Security Hardening

**Status:** COMPLETED (2026-07-08)

- [x] `login_user.py`: constant-time bcrypt verify with `_DUMMY_HASH` for unknown users (prevents timing-based user enumeration)
- [x] `login_user.py`: reject inactive users (`not user.is_active`) with same `InvalidCredentialsError`
- [x] `tests/test_auth.py`: added `test_login_unknown_email_returns_401` and `test_login_inactive_user_returns_401`; added `auth_client_with_db` fixture for direct DB manipulation
- [x] `config.py`: `jwt_secret_key` / Stripe keys → `SecretStr` + production fail-fast validator
- [x] `auth/presentation/schemas.py`: `EmailStr` + `password` length constraints + `pydantic[email]`
- [x] `auth/domain/ports.py`: `IPasswordHasher` + `ITokenService` interfaces
- [x] `auth/infrastructure/security/`: `bcrypt_hasher.py` + `jwt_token_service.py` adapters
- [x] `auth/domain/ports.py`: `IUnitOfWork` port; commit boundary moved out of repository
- [x] `main.py`: `GET /health/ready` readiness probe
- [x] `app/core/middleware.py`: X-Request-ID middleware + structured logging

### Sprint 6 — JWT Verification & Auth Foundation

**Status:** COMPLETED (2026-07-08)

- [x] `ITokenService.verify_access_token()` + `InvalidTokenError` + `TokenClaims`
- [x] `IUserRepository.get_by_id()` for token-based user lookup
- [x] `auth/presentation/dependencies.py`: `get_current_user` FastAPI dependency
- [x] `GET /api/v1/auth/me` protected endpoint
- [x] `JwtTokenService` constructor injection (settings wired in DI provider)
- [x] `__init__.py` in all Python packages
- [x] Auth tests: `/me` with valid/invalid/missing token (19/19 pytest green)
- [x] Frontend: `/login`, `/register`, `/account` pages
- [x] Frontend: httpOnly cookie session + `middleware.ts` route guard
- [x] Frontend: `SiteHeader` with auth state + server actions
- [x] `openapi.yaml`: `/health/ready`, `/auth/me`, `bearerAuth` security scheme

### Storefront Design (stich.su-inspired UX)

**Status:** COMPLETED

- [x] S1 — Design tokens + `site-config.ts`
- [x] S2 — Layout shell (TopBar, MainHeader, TrustBar, Footer, MobileBottomNav)
- [x] S3 — Catalog components (ProductCard, SectionTabs, PromoBanner, etc.)
- [x] S4 — Homepage rework + `/catalog` + `/catalog/[slug]` routes
- [x] S5 — PDP extension + `/search` + `/cart` placeholders
- [x] S6 — Auth pages RU polish + E2E updates

### Sprint 7 — Category Domain

**Status:** COMPLETED (2026-07-08)

- [x] `Category` domain entity (`domain/entities.py`)
- [x] `ICategoryRepository` port — `list_active()` + `get_by_slug()` (`domain/ports.py`)
- [x] `ListCategoriesUseCase` (`application/use_cases/list_categories.py`)
- [x] `CategoryRepository` SQLAlchemy implementation (`infrastructure/persistence/category_repository.py`)
- [x] `CategoryModel` + self-referential `parent_id` FK (`infrastructure/persistence/models.py`)
- [x] Migration `004_create_categories_table` (slug unique, parent_id, is_active+sort composite indexes)
- [x] `CategorySchema` + `CategoryListResponse` (`presentation/schemas.py`)
- [x] `GET /api/v1/categories` router registered in `main.py`
- [x] `openapi.yaml`: `/api/v1/categories` + `Category`/`CategoryListResponse` schemas
- [x] Frontend `getCategories()` API client + `Category` type (`lib/api.ts`)
- [x] `/catalog` + `/catalog/[slug]` fetch live categories with static fallback
- [x] `tests/test_categories.py`: 5 tests (active-only, shape, parent_id, empty db, ordering)
- [x] Full backend suite: 24/24 pytest green

### Sprint 8 — Product Variants & Pricing Display

**Status:** COMPLETED (2026-07-08)

- [x] ADR-002 — variants, single-currency compare-at pricing, primary-category FK
- [x] `ProductVariant` domain entity + `compare_at_price_cents` invariant on `Product` (`domain/entities.py`)
- [x] `category_id` primary-category FK + `category` slug filter on `IProductRepository.list_products` (`domain/ports.py`)
- [x] `ProductRepository`: variant mapping on detail (`selectinload`), category-slug filter on list
- [x] `ProductVariantModel` + `products.compare_at_price_cents`/`category_id` (`infrastructure/persistence/models.py`)
- [x] Migration `005_add_variants_pricing_category` (product_variants table, compare-at CHECK, category FK + index)
- [x] `ProductVariantSchema` + `compare_at_price_cents`/`category_id`/`variants` on `ProductSchema` (`presentation/schemas.py`)
- [x] `GET /api/v1/products?category=` filter wired in router
- [x] `openapi.yaml`: `ProductVariant` schema, product variant/compare-at/category fields, `category` query param
- [x] `scripts/seed_dev.py`: categories + products with variants + sale prices (one default variant per product)
- [x] Frontend `Product`/`ProductVariant` types + `listProducts(..., categorySlug)` (`lib/api.ts`)
- [x] `ProductPurchasePanel`: variant selector + sale price + discount badge (`components/store/catalog/`)
- [x] `/catalog` + `/catalog/[slug]` filter by real primary-category (removed `assignCategorySlug` mock)
- [x] `categories.ts`: dead mock helpers removed; retained as offline fallback only
- [x] `tests/test_variants.py`: 11 tests (variant ordering/shape, sale vs no-sale, category filter, domain invariant)
- [x] Full backend suite: 35/35 pytest green; TypeScript 0 errors

### Feature: Checkout & Payments

**Status:** BACKLOG

- [ ] Cart session management
- [ ] Stripe PaymentIntent integration
- [ ] Webhook handler with idempotency
- [ ] Order confirmation flow

---

## Technical Tasks

**Status:** IN_PROGRESS

- [x] Alembic setup and initial migration
- [x] API pytest baseline (health + catalog)
- [x] CI pipeline (lint, test, build) — `.github/workflows/ci.yml`
- [x] Playwright E2E baseline — `apps/web/e2e/homepage.spec.ts`
- [x] `.cursorignore` for `node_modules` (per ADR-001 consequence)

---

## Bugs

None reported.

---

## Improvements

**Status:** COMPLETED

- [x] Add Phase 25 to PROJECT_ROADMAP for Project Management Layer
- [x] Sync DECISIONS.md when new ADRs are created (architecture-decision-records skill)
- [x] Cursor hooks for sessionStart/stop/subagentStop
- [x] Tiered context loading in context-loading skill
- [x] PM validation script (`.cursor/scripts/validate-pm-state.ps1`)
- [x] HANDOFF archive pattern (`docs/handoffs/`)
- [x] Integrate PM protocol into all 11 agents and workflow
- [x] Create domain workflows in `workflows/` (catalog, checkout, session-handoff)
- [x] Add `.cursor/agents/README.md` agent index
- [x] Split AI Platform vs Phase 24 metrics in PROJECT_ROADMAP and PROJECT_STATUS
- [x] Initialize git repository
