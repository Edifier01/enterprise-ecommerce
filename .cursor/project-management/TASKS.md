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
- [x] `.cursor/agents/project-orchestrator.md` — main feature coordinator (GPT-5.5, readonly; was Opus pre-AI-002)
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

### Sprint 9 — Checkout Foundation

**Status:** CLOSED (2026-07-09)

**Scope:** Cart, checkout sessions, payment records, Stripe PaymentIntent prototype, webhooks, order creation, storefront checkout UX. Final provider (YooKassa) deferred per ADR-004.

- [x] ADR-003 — Stripe checkout foundation, payment/order lifecycle, order creation invariant
- [x] ADR-004 — YooKassa selected as final provider; Stripe validation not a release blocker
- [x] Cart session management (guest/auth cart model, server-side line snapshots)
- [x] Stripe PaymentIntent integration (Payment Element flow, idempotency key)
- [x] Webhook handler with signature verification + event idempotency
- [x] Order confirmation flow (order created only from `payment_intent.succeeded`)
- [x] Frontend cart, checkout, and confirmation pages
- [x] Guest-cart merge into auth login flow
- [x] Browser-auth checkout (`access_token` cookie recognized by checkout API)
- [x] Checkout price revalidation refreshes stale server-side cart snapshots
- [x] Checkout security hardening (Stripe CSP/security headers + checkout/webhook rate limiting)
- [x] Captured-payment anomaly paths emit critical manual-review logs
- [x] Migration `006_add_checkout_payments_orders` validated at PostgreSQL head
- [x] Backend tests: 48/48 pytest green at formal closeout
- [x] Frontend TypeScript: `tsc --noEmit` clean at formal closeout
- [x] Browser shell smoke: PDP → cart → checkout against local API (`localhost:3000`)
- [x] PM state synced; inventory reservation/deduction deferred to Sprint 10 (ADR-003)

**Formal closeout quality gate (2026-07-09):** 48/48 pytest, ruff clean, tsc clean, migration 006 at head, browser shell smoke passed.

### Sprint 10 — Inventory Reservation and Deduction

**Status:** COMPLETED (2026-07-09)

- [x] ADR-005 — inventory reservation lifecycle, concurrency, and checkout integration
- [x] Inventory bounded context (`apps/api/app/features/inventory/`)
- [x] Migration `007_add_inventory_reservations` (`inventory_items`, `inventory_reservations`)
- [x] Reserve at checkout session creation; re-affirm at payment intent
- [x] Deduct on verified payment success (same transaction as order creation)
- [x] Release on payment failed/canceled webhook paths
- [x] Cart availability checks via `ensure_available` (409 on insufficient stock)
- [x] Frontend RU out-of-stock messaging in cart/checkout (`getCheckoutErrorMessage`)
- [x] `seed_dev.py` seeds `inventory_items` with default quantities per variant
- [x] Backend tests: 51/51 pytest green (inventory reserve/deduct/release/idempotency)
- [x] Backend lint: ruff clean; Frontend TypeScript: tsc clean

### Feature: Dev Payment Stub (no real provider)

**Status:** COMPLETED (2026-07-09)

- [x] ADR-006 — dev payment stub pattern, webhook simulation, production guardrails
- [x] `StubPaymentGateway` behind `IStripeGateway` (`infrastructure/stub/gateway.py`)
- [x] `payment_provider=auto|stub|stripe` config with production fail-fast for stub
- [x] `POST /api/v1/dev/payments/{id}/simulate-success` — routes through `WebhookService`
- [x] Frontend stub mode (`NEXT_PUBLIC_PAYMENT_MODE=auto|stub|stripe`) + test payment button
- [x] Stripe Payment Element extracted to `checkout-stripe-payment-form.tsx` (lazy load)
- [x] Backend tests: stub PI creation, simulate-success order, production guard (54/54 pytest)
- [x] Playwright E2E `checkout-stub-smoke.spec.ts` — full stub checkout flow
- [x] E2E bootstrap (`scripts/start-e2e-api.mjs`) + `reset_e2e_checkout.py` for isolated DB state
- [x] `.env.example` updated with payment provider env vars

### Feature: Catalog Search

**Status:** COMPLETED (2026-07-09)

- [x] `SearchProductsUseCase` + `IProductRepository.search_products()` (name + variant SKU, case-insensitive ILIKE)
- [x] `GET /api/v1/products/search?q=&page=&limit=` with relevance ordering
- [x] Search rate limit (60 req/min) in `CheckoutRateLimitMiddleware`
- [x] `openapi.yaml`: `/api/v1/products/search` endpoint
- [x] Frontend `searchProducts()` API client + `/search?q=` Server Component with `ProductGrid`
- [x] `CatalogSearchForm` replaces `SearchPlaceholder`
- [x] Backend tests: `tests/test_search.py` (6 tests)
- [x] Playwright E2E `search-smoke.spec.ts`
- [x] Quality gate: 60/60 pytest, ruff clean, tsc clean

### Feature: Order History UI

**Status:** COMPLETED (2026-07-09)

- [x] `ListOrdersUseCase` + `GetOrderUseCase` with customer-scoped repository queries
- [x] `GET /api/v1/orders` — paginated list (JWT required)
- [x] `GET /api/v1/orders/{order_number}` — detail with line snapshots
- [x] `openapi.yaml`: orders endpoints + schemas
- [x] Frontend `/account/orders` list + `/account/orders/[orderNumber]` detail
- [x] `lib/orders.ts` authenticated API client
- [x] Account profile link to order history
- [x] Backend tests: `tests/test_orders.py` (5 tests)
- [x] Quality gate: 65/65 pytest, ruff clean, tsc clean

### Feature: Inventory Reservation TTL Background Job

**Status:** COMPLETED (2026-07-09)

- [x] Config: `inventory_reservation_ttl_minutes`, `inventory_reservation_sweep_enabled`, `inventory_reservation_sweep_interval_seconds`
- [x] `sweep_expired_reservations` use case + `run_reservation_expiry_sweep()` entrypoint
- [x] Asyncio periodic scheduler wired in FastAPI lifespan (`reservation_sweep_scheduler.py`)
- [x] One-shot CLI: `python -m scripts.expire_inventory_reservations`
- [x] Checkout `InventoryService` uses configurable TTL from settings
- [x] Pytest disables background sweep via `INVENTORY_RESERVATION_SWEEP_ENABLED=false`
- [x] Tests: `tests/test_reservation_sweep.py` (4 tests)
- [x] `.env.example` updated
- [x] Quality gate: 69/69 pytest, ruff clean

### Sprint A — Admin Foundation

**Status:** COMPLETED (2026-07-09)

- [x] ADR-007 — admin panel architecture (separate `admin_users`, RBAC, `/api/v1/admin/*`)
- [x] Migration `008_add_admin_users`
- [x] Admin auth: `POST /api/v1/admin/auth/login`, `GET /api/v1/admin/auth/me`
- [x] RBAC: `require_permission()`, roles `superadmin` / `viewer`
- [x] Dashboard: `GET /api/v1/admin/dashboard/summary` (orders, revenue, low stock)
- [x] Frontend: `/admin/login`, admin layout (Sidebar), dashboard page
- [x] Middleware guard for `/admin/*` (separate `admin_access_token` cookie)
- [x] Dev seed: `admin@localhost` via `seed_dev.py`
- [x] Tests: `tests/test_admin.py` (8 tests)
- [x] Playwright E2E `admin-login-smoke.spec.ts`
- [x] `openapi.yaml`: admin endpoints + schemas
- [x] `.env.example`: `ADMIN_DEV_EMAIL`, `ADMIN_DEV_PASSWORD`, `ADMIN_LOW_STOCK_THRESHOLD`

### Sprint B — Catalog Admin

**Status:** COMPLETED (2026-07-09)

- [x] Migration `009_add_product_status` (`draft` | `active` | `archived`)
- [x] Public catalog filters `status=active` only (list, search, detail)
- [x] Admin API `/api/v1/admin/catalog/*` — products, variants, categories CRUD
- [x] RBAC: `catalog:write` on mutations, `admin:read` on lists
- [x] Frontend `/admin/catalog` — list, create, edit, categories
- [x] Sidebar «Каталог» enabled
- [x] Tests: `tests/test_admin_catalog.py` (7 tests)
- [x] Playwright E2E `admin-catalog-smoke.spec.ts`
- [x] `openapi.yaml` admin catalog endpoints synced

### Sprint C — Inventory Admin

**Status:** COMPLETED (2026-07-09)

- [x] Admin API `GET/PATCH /api/v1/admin/inventory`
- [x] List with SKU, product name, on_hand, reserved, available
- [x] Filter `low_stock` via global `ADMIN_LOW_STOCK_THRESHOLD`
- [x] Adjust `quantity_on_hand` with reason + optimistic version
- [x] RBAC: `inventory:write` on PATCH
- [x] Frontend `/admin/inventory` table + inline adjustment form
- [x] Sidebar «Склад» enabled
- [x] Tests: `tests/test_admin_inventory.py` (6 tests)
- [x] `openapi.yaml` admin inventory endpoints synced

### Sprint D — Orders Admin

**Status:** COMPLETED (2026-07-09)

- [x] `OrderStatus.SHIPPED` + transition rules (confirmed → shipped/canceled, shipped → canceled)
- [x] Admin API `GET/PATCH /api/v1/admin/orders/*`
- [x] List with customer email, filter by status, pagination
- [x] Detail with lines + status history
- [x] Cancel restores inventory (`restore_on_hand`)
- [x] RBAC: `admin:read` list/detail, `orders:write` on PATCH
- [x] Frontend `/admin/orders` list + `/admin/orders/[orderNumber]` detail
- [x] Sidebar «Заказы» enabled
- [x] Tests: `tests/test_admin_orders.py` (7 tests)
- [x] Playwright E2E `admin-orders-smoke.spec.ts`
- [x] `openapi.yaml` admin orders endpoints synced

### Sprint E — Wholesale Pricing (Опт / Розница)

**Status:** COMPLETED (2026-07-10)

**ADR:** `docs/adr/ADR-008-wholesale-retail-pricing.md`

**Goal:** Two prices per SKU (retail + wholesale). Wholesalers see both and buy at
wholesale; retail customers see and pay retail only. Wholesaler status is permanent,
admin-assigned. Existing orders are never repriced.

#### E1 — Architecture & Schema — COMPLETED

#### E2 — Public Catalog & Customer API — COMPLETED

#### E3 — Cart, Checkout & Orders — COMPLETED

#### E4 — Admin API & RBAC — COMPLETED

#### E5 — Storefront UX — COMPLETED

#### E6 — Admin UI — COMPLETED

#### E7 — Quality Gate — COMPLETED

**Out of scope (Sprint E):** volume tiers, temporary wholesaler contracts, multi-currency wholesale, automatic wholesaler self-registration.

---

### Sprint E — Wholesale Pricing (Опт / Розница) — ARCHIVED DETAIL

**Status:** COMPLETED (2026-07-10)

- [ ] ADR-008 accepted and indexed in `DECISIONS.md`
- [ ] Migration `010_wholesale_pricing`: `product_variants.wholesale_price_cents` (nullable), `users.is_wholesaler` (default false)
- [ ] DB CHECK: `wholesale_price_cents IS NULL OR wholesale_price_cents <= price_cents`
- [ ] Domain: document `price_cents` as retail; `PriceTier` enum (`retail` | `wholesale`)
- [ ] `IPriceTierResolver` (or catalog port): resolve unit price from variant + buyer tier
- [ ] Order/cart line snapshot: persist `price_tier` on new orders (additive column or JSON snapshot field)
- [ ] `seed_dev.py`: sample wholesale prices + one wholesaler test customer

#### E2 — Customer Tier API

**Status:** PLANNED

- [ ] `GET /api/v1/auth/me` → `is_wholesaler: boolean`
- [ ] Admin `GET /api/v1/admin/customers` — paginated list (email, created_at, is_wholesaler)
- [ ] Admin `PATCH /api/v1/admin/customers/{id}/wholesaler` — grant/revoke (RBAC: `customers:write`, superadmin in Sprint E)
- [ ] Revoking tier does not touch existing `orders` / `order_lines`
- [ ] Tests: grant/revoke, non-admin forbidden, me endpoint shape

#### E3 — Catalog, Cart & Checkout Integration

**Status:** PLANNED

- [ ] Public/customer catalog + search: **omit** `wholesale_price_cents` for non-wholesalers
- [ ] Wholesaler-authenticated catalog + search: expose both `price_cents` and `wholesale_price_cents`
- [ ] `cart_service` / checkout revalidation: charge via resolver (wholesale for wholesalers when set)
- [ ] Checkout 409 when wholesaler buys variant with null wholesale (explicit error message)
- [ ] Tests: price leak prevention (regular JWT never receives wholesale field)
- [ ] Tests: wholesaler cart totals use wholesale; guest/regular use retail
- [ ] Tests: order line stores correct `unit_price_cents` + `price_tier`

#### E4 — Admin & Storefront UI

**Status:** PLANNED

- [ ] Admin catalog forms: wholesale price per variant (validation ≤ retail)
- [ ] Admin `/admin/customers` — list + wholesaler toggle + badge «Оптовик»
- [ ] Sidebar «Клиенты» (or under existing admin nav)
- [ ] Storefront PDP/catalog: regular — retail only; wholesaler — both prices labeled «Розница» / «Опт»
- [ ] Account page: wholesaler badge when `is_wholesaler`
- [ ] Cart/checkout summary uses tier-appropriate price (no wholesale label for regular users)

#### E5 — Quality Gate

**Status:** PLANNED

- [ ] `openapi.yaml` synced (me, catalog conditional fields, admin customers)
- [ ] pytest: full wholesale regression suite green
- [ ] Playwright: `wholesale-pricing-smoke.spec.ts` — regular user cannot see wholesale; wholesaler can buy at wholesale
- [ ] Playwright: admin grant wholesaler → storefront reflects dual pricing
- [ ] Ruff + `tsc --noEmit` clean

**Sprint E exit criteria:** All E1–E5 checkboxes complete; no wholesale price in API responses for non-wholesaler tokens; one E2E path wholesaler checkout → order at wholesale `unit_price_cents`.

---

### Sprint E — Wholesale Pricing (Опт / Розница)

**Status:** COMPLETED (2026-07-10) (2026-07-10)

**Goal:** Two prices per SKU (retail + wholesale). Wholesalers see both and buy at
wholesale; retail customers see and pay retail only. Wholesaler status is permanent,
admin-assigned. Existing orders are never repriced.

**ADR:** `docs/adr/ADR-008-wholesale-retail-pricing.md`

#### E1 — Architecture & Schema

- [ ] ADR-008 accepted and indexed in `DECISIONS.md`
- [ ] Migration `010_add_wholesale_pricing`: `product_variants.wholesale_price_cents` + CHECK (`>= 0`, `<= price_cents`)
- [ ] Migration: `users.is_wholesaler` boolean (default `false`, NOT NULL)
- [ ] Domain: variant entity + invariants; `User.is_wholesaler` on customer entity
- [ ] `PricingService` / port: `resolve_unit_price_cents(variant, buyer)` — single authority
- [ ] Order line snapshot records `price_tier` (`retail` | `wholesale`) for audit
- [ ] Backfill seed: `wholesale_price_cents` for all variants in `seed_dev.py` (~80% of retail)

#### E2 — Public Catalog & Customer API

- [ ] Public product/list/search/detail schemas: `wholesale_price_cents` **omitted** unless buyer `is_wholesaler`
- [ ] Authenticated retail customer: same as anonymous (no wholesale leak)
- [ ] Authenticated wholesaler: both prices in API responses
- [ ] `GET /api/v1/auth/me` exposes `is_wholesaler` for storefront badge/UX
- [ ] Tests: retail vs wholesaler API visibility (`tests/test_wholesale_pricing.py`)

#### E3 — Cart, Checkout & Orders

- [ ] `cart_service`: use `resolve_unit_price_cents` on add/update/revalidate
- [ ] Checkout session totals and payment intent amount use resolved tier
- [ ] Order creation snapshots resolved price + tier; **no retroactive changes**
- [ ] Removing wholesaler status does not alter existing orders or order history UI
- [ ] Tests: wholesaler checkout at wholesale; retail at retail; price tamper resistance

#### E4 — Admin API & RBAC

- [ ] Admin catalog write: `wholesale_price_cents` on variant create/update
- [ ] `GET /api/v1/admin/customers` — paginated customer list (email, `is_wholesaler`, created_at)
- [ ] `PATCH /api/v1/admin/customers/{id}/wholesaler` — grant/revoke (permission `customers:write`)
- [ ] RBAC: `superadmin` has `customers:write`; `viewer` read-only
- [ ] Tests: `tests/test_admin_customers.py`, extend `test_admin_catalog.py` for wholesale fields
- [ ] `openapi.yaml` synced

#### E5 — Storefront UX

- [ ] PDP / catalog cards: retail only for default users
- [ ] Wholesaler: dual-price display (“Розница” / “Опт”) on PDP and cards
- [ ] Account profile: wholesaler badge when `is_wholesaler`
- [ ] Cart & checkout summary uses correct tier (server-driven; no client price pick)
- [ ] TypeScript types updated; no wholesale fields in retail-facing types unless narrowed

#### E6 — Admin UI

- [ ] Catalog admin: wholesale price field on product create/edit (per variant)
- [ ] New `/admin/customers` — list + toggle wholesaler status
- [ ] Admin sidebar: «Клиенты» link
- [x] Playwright E2E: `admin-wholesale-smoke.spec.ts` (toggle wholesaler + verify dual price)
- [x] Playwright E2E: `wholesale-checkout-smoke.spec.ts` (wholesaler pays wholesale)

#### E7 — Quality Gate

- [ ] Full pytest green; ruff clean; `tsc --noEmit` clean
- [ ] Manual smoke: retail user cannot see wholesale in network responses
- [ ] PM files updated on sprint closeout

**Out of scope (Sprint E):** volume tiers, temporary wholesaler contracts, multi-currency wholesale, automatic wholesaler self-registration.

---

### Feature: Tactical Storefront Design (Phase 1)

**Status:** COMPLETED (2026-07-15)

- [x] Olive / amber tactical palette in `globals.css`
- [x] TrustBar with 4 USP items + StoreHeader wiring
- [x] Category cards with icon/gradient visuals
- [x] Homepage category section + SectionHeader «Смотреть все»
- [x] Tactical promo banners, SEO copy, catalog copy
- [x] Dark footer + product-grid loading skeleton
- [x] Static categories + seed_dev tactical categories
- [x] E2E homepage tests updated

**Follow-up (Phase 2 — COMPLETED 2026-07-15):**
- [x] Mega-menu / mobile category drawer
- [x] Catalog filters (color, size, price, stock, sale — server-side)
- [x] PDP specs table + mobile sticky CTA
- [x] Add-to-cart toast
- [ ] Real product/category photography

**Follow-up (Phase 3 — IN_PROGRESS partial):**
- [x] Server-side catalog filter API (`GET /products` query params + `/products/facets`)
- [x] Frontend URL-synced filters on category pages
- [x] Search page filters (server-side, URL-synced)
- [ ] Real product/category photography

---

### Feature: Production Catalog Optimization (Wave 1–2)

**Status:** COMPLETED (2026-07-16)

- [x] ADR-009 — product content + homepage collections
- [x] Migration 013 — `products.description`, `products.image_url`
- [x] API-driven homepage SectionTabs (hits / new / sale)
- [x] Contextual «Смотреть все» per active tab
- [x] Catalog pagination on category PLP + search
- [x] Category `product_count` in API + cards
- [x] PDP: description, image, SKU, category breadcrumbs, JSON-LD
- [x] Seed: RUB currency + subcategories
- [x] Remove unused `category-nav-bar.tsx`

**Backlog (Wave 3):**
- [x] PromoBanner on homepage
- [x] Related products on PDP
- [x] Dynamic facet counts
- [ ] Real product/category photography (production assets)

---

### Feature: Homepage Search UX Simplification

**Status:** COMPLETED (2026-07-16)

- [x] Search placeholder «Название» in header and `/search` page
- [x] Remove 2 promo cards (`PromoBanner`) from homepage — «Подборки» directly under header
- [x] E2E: `homepage.spec.ts`, `search-smoke.spec.ts` updated

---

### Feature: Homepage Recommendations (Popular Sort)

**Status:** COMPLETED (2026-07-16)

- [x] Replace «Хиты сезона» with «Рекомендации» in SectionTabs
- [x] Backend `sort=popular` — sales score from order_lines (90-day window)
- [x] Homepage + catalog «Смотреть все» wired to popular sort
- [x] Pytest `test_recommendations.py`; E2E homepage tab label updated

---

### Feature: Admin Categories (Hierarchy + Instant Sync)

**Status:** COMPLETED (2026-07-16)

- [x] 2-level parent validation (API 422 for nested subcategory parent)
- [x] `CATEGORIES_CACHE_TAG` + `revalidateTag` on category mutations
- [x] Admin tree table + inline edit (name, slug, parent, description)
- [x] «+ Категория» button on catalog category picker
- [x] Pytest + E2E smoke for root + subcategory creation

---

### Feature: Admin UX Polish (Category, RUB, Wholesaler)

**Status:** COMPLETED (2026-07-16)

- [x] Remove manual wholesaler toggle from `/admin/customers` (variant A — registration only)
- [x] Category-first admin catalog UX with `category_id` / `uncategorized` / `all` filters
- [x] Backend `GET /admin/catalog/products?category_id=` + `?uncategorized=true`
- [x] RUB default currency in admin API + forms in rubles + ₽ formatting
- [x] Tests: 16/16 `test_admin_catalog.py`; E2E `admin-catalog-smoke.spec.ts` updated

---

### Feature: E2E Test Stabilization

**Status:** COMPLETED (2026-07-16)

- [x] Shared E2E helpers (`test-helpers.ts`) — admin/wholesaler login, cart add, PDP panel locators
- [x] Fix admin catalog slug strict-mode assertion + form redirect catch bug
- [x] Fix cart line upsert race (`ON CONFLICT` in checkout repository)
- [x] Stabilize wholesale checkout (ensureCartEmpty, serial wholesale specs)
- [x] Refresh seed credentials for E2E (`admin@example.com`, wholesaler)
- [x] Quality gate: **24/24 Playwright E2E passing**

---

### Feature: Admin Panel Optimization (Wave A–B)

**Status:** COMPLETED (2026-07-16)

- [x] Product content fields in admin forms (`description`, `image_url`, `compare_at_price_cents`)
- [x] Catalog list thumbnails + status filter + pagination
- [x] Category `description` on create + `product_count` column
- [x] `AdminPagination` on orders, inventory, customers
- [x] Field-level 422 validation in server actions
- [x] Admin `loading.tsx` skeleton
- [x] Active sidebar nav + dashboard deep links
- [x] Admin catalog search (`?q=` name/slug/SKU)
- [x] Variant CRUD UI on product edit page
- [x] Category parent selector + hierarchy in dropdowns
- [x] Local media upload endpoint + admin image widget
- [x] Tests: 15 in `test_admin_catalog.py`

**Backlog (production media):**
- [ ] S3 presigned upload + CDN (replace local `/media` storage)

---

### Feature: Email Verification & Password Reset

**Status:** COMPLETED (2026-07-15)

- [x] Migration 012 — `email_verified_at` + `auth_tokens`
- [x] Email verification for retail + wholesale registration
- [x] Login blocked until email verified (403)
- [x] Password reset flow (forgot + reset)
- [x] ConsoleEmailService for dev; SMTP stub for prod
- [x] Frontend pages + server actions (RU)
- [x] OpenAPI + 19 auth pytest tests
- [ ] **Follow-up:** SMTP production delivery (next step)

---

### Feature: Mobile Storefront Optimization (Wave 3)

**Status:** COMPLETED (2026-07-19)

- [x] Service worker (`public/sw.js`) + `PwaRegister` + `/offline` page
- [x] Product image CDN helper + blur placeholders (`lib/store/product-image.ts`)
- [x] Admin mobile card layouts: orders, customers, inventory, catalog list
- [x] `next.config` remotePatterns for CDN/API images; `.env.example` docs
- [x] E2E: mobile admin customers card layout test
- [x] `tsc --noEmit` green

---

### Feature: Mobile Storefront Optimization (Wave 2)

**Status:** COMPLETED (2026-07-19)

- [x] Hide storefront chrome on `/admin/*` (`ConditionalStoreChrome`)
- [x] Admin mobile drawer nav + responsive panel padding
- [x] PWA: `manifest.ts`, appleWebApp, icons, themeColor
- [x] Core Web Vitals baseline: viewport metadata, font swap + cyrillic, text-size-adjust
- [x] E2E: `mobile-admin.spec.ts` (2 tests)
- [x] `tsc --noEmit` green

---

### Feature: Mobile Storefront Optimization (Wave 1)

**Status:** COMPLETED (2026-07-19)

- [x] Compact mobile header (hide TopBar/TrustBar on `< md`, 2-row layout)
- [x] Route-aware bottom nav (hidden on `/cart`, `/checkout*`)
- [x] Cart sticky checkout bar on mobile
- [x] Catalog mobile sort/filters touch targets
- [x] Playwright `mobile-chrome` project + 5 smoke tests
- [x] `tsc --noEmit` green

---

### Feature: Storefront Header Structure (stich.su layout)

**Status:** COMPLETED (2026-07-15)

- [x] Unified `StoreHeader` wired in `layout.tsx`
- [x] Row 1 trimmed TopBar (no О КОМПАНИИ / ОБРАТНЫЙ ЗВОНОК)
- [x] Row 2: logo + «Сухопут» + search + ЛК + cart
- [x] Row 3: «Новинки» + API categories with dividers
- [x] Sticky rows 2+3; slate palette unchanged
- [x] E2E header structure test updated

---

### Feature: СУХОПУТ Branding, Header UX & Registration

**Status:** COMPLETED (2026-07-13)

- [x] TopBar centered search; «Связаться» retained
- [x] MainHeader cart icon; email removed; desktop nav trimmed
- [x] Store name «СУХОПУТ» + logo + favicon
- [x] Retail registration: first_name, last_name, email, password
- [x] Wholesaler self-registration with business profile + validation
- [x] Migration 011 + API + OpenAPI + tests (119/119 pytest)

---

### Final Project Gate — YooKassa Payment Integration

**Status:** PLANNED

- [ ] Replace/refactor Stripe-specific payment provider integration with YooKassa
- [ ] Update payment configuration, webhook/notification handling, OpenAPI naming, frontend checkout UI, CSP/security headers, and tests for YooKassa
- [ ] Run full browser payment smoke through YooKassa test mode to provider-confirmed order creation
- [ ] Verify payment logs do not expose provider payloads, secrets, confirmation tokens, card data, or equivalent sensitive details

---

### Epic: MoySklad ERP Integration (ADR-010)

**Status:** IN_PROGRESS

**ADR:** `docs/adr/ADR-010-moysklad-erp-integration.md`

**Warehouse:** single store via `MOYSKLAD_STORE_ID`

#### Phase 1 — Foundation — IN_PROGRESS

- [x] ADR-010 accepted and indexed in `DECISIONS.md`
- [x] Migration 014 — sync fields, product_images, category mappings, sync logs, orders.moysklad_order_id
- [x] `integrations/moysklad` module — ACL client, sync guard, admin status API
- [x] Admin API guards — block MS-owned field edits (catalog + inventory)
- [x] Config env vars in `.env.example`
- [x] Pytest: sync guard + status endpoint (7 tests)
- [ ] Run migration 014 on dev DB

#### Phase 2 — Catalog Import — IN_PROGRESS

- [x] Full product/variant import use case (paginated, rate-limit aware)
- [x] Price mapping (`Цена продажи` retail, `Розница` wholesale when valid)
- [x] New MS products → `draft` status
- [x] Upsert by `moysklad_*_id`; preserve display fields
- [x] CLI/script: `python -m scripts.import_moysklad_catalog`
- [x] Admin `POST /sync/trigger` runs full import
- [x] Stock from single warehouse via `stockByStore` report
- [ ] Run migration + import on dev DB (requires Docker/PostgreSQL)

#### Phase 3 — Stock Sync + Webhooks — COMPLETED

- [x] `SyncMoySkladStockUseCase` — pull stock from configured warehouse
- [x] Webhook endpoint `POST /api/v1/integrations/moysklad/webhook` (inbound only)
- [x] Entity sync on webhook (product/variant CREATE/UPDATE/DELETE)
- [x] Cron fallback (`MOYSKLAD_SYNC_CRON_ENABLED`) in app lifespan
- [x] Webhook dedup + `webhooks_enabled` flag (site-side only)
- [x] Admin: `POST /sync/pull`, `POST /sync/stock` — inbound only, read-only MS client
- [x] Ops CLI `register_moysklad_webhooks.py` (not in admin — registers in MS)
- [x] HTTP client restricted to GET (never writes to MoySklad)

#### Phase 4 — Display Layer (8.3–8.7) — COMPLETED

- [x] Product gallery API + admin UI (`product_images`)
- [x] SEO fields in admin forms + PDP `<head>` (8.5)
- [x] Category ↔ MS folder mapping UI (8.3)
- [x] MS photo as placeholder on first import only (8.4) — `erp_image_url` in gallery UI
- [x] Barcode/weight/dimensions read-only display (8.6)
- [x] Admin `/admin/integrations/moysklad` monitoring page (8.7)
- [x] Filter «Требует оформления» (draft without photos)
- [x] Badge «Из МойСклад» + deep link on product edit

#### Phase 5 — Order Export (8.1) — COMPLETED

- [x] `CreateCustomerOrder` in MoySklad on payment success
- [x] Counterparty create/link by customer email
- [x] Idempotent export (`orders.moysklad_order_id`)
- [x] Retry via cron + manual `POST /orders/{order_number}/export`
- [x] Outbound client separate from read-only catalog client
- [x] Admin: export status on order detail + pending count on integration page

#### Phase 6 — Operations & Returns (8.12 backlog) — COMPLETED

- [x] Returns sync hook (MS → site order status)
- [x] Full resync admin action
- [x] OpenAPI sync for integration endpoints
- [x] Playwright: admin MS-synced product read-only fields smoke

#### Phase 7 — Import Queue Workflow — COMPLETED

- [x] Remove MS folder category mapping (UI + API)
- [x] Admin import queue tab for uncategorized MS products
- [x] Storefront visibility: MS products require admin-assigned category
- [x] DELETE admin category (products unlinked, MS products re-hidden)
- [x] Hide product from storefront (`status=archived`)
- [x] Stock threshold: available `< 3` → out of stock on storefront
- [x] Tests: `test_moysklad_catalog_workflow.py`

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
