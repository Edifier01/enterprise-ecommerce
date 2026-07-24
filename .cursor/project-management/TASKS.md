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

### Feature: stich.su UX Parity Without Redesign

**Status:** IN_PROGRESS (P0/P1 code done 2026-07-24; deploy + optional E2E pending)

**Gap doc:** `docs/reviews/STICH-SU-PARITY-GAP-ANALYSIS-2026-07-24.md`  
**ADR:** none required (extends ADR-002/003/005/010/011)

- [x] Stage 1 — analyze stich.su catalog/PDP/cart/checkout/account
- [x] PDP gallery loupe + lightbox (`product-gallery.tsx`)
- [x] Mini-cart dropdown on existing cart API
- [x] Checkout shipping Zod validation
- [x] Filter pending opacity polish; remove unused `categorySlug` prop
- [x] Verifier PASSED WITH NOTES
- [ ] Commit + prod deploy smoke
- [ ] Optional Playwright smoke (mini-cart / invalid shipping)

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

**Status:** COMPLETED (2026-07-10) — see main Sprint E section above; duplicate checklist retained for history only.

---

### Sprint E duplicate checklist — REMOVED (2026-07-21 review cleanup)

The third duplicate Sprint E section was removed during full project review. All E1–E7 work is tracked in the primary Sprint E block above.

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
- [x] S3 presigned upload + CDN backend (`media_storage_backend=s3`, `/admin/media/presign`)
- [ ] Production S3 bucket + CDN provisioning and env configuration

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
- [x] Run migration 014 on dev DB

#### Phase 2 — Catalog Import — IN_PROGRESS

- [x] Full product/variant import use case (paginated, rate-limit aware)
- [x] Price mapping (`Цена продажи` retail, `Розница` wholesale when valid)
- [x] New MS products → `draft` status
- [x] Upsert by `moysklad_*_id`; preserve display fields
- [x] CLI/script: `python -m scripts.import_moysklad_catalog`
- [x] Admin `POST /sync/trigger` runs full import
- [x] Stock from single warehouse via `stockByStore` report
- [x] Run migration + import on dev DB (requires Docker/PostgreSQL)

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

#### Phase 8 — MS-Only Admin Workflow — COMPLETED

- [x] Block manual product creation (API 403 + UI redirect)
- [x] Admin catalog filters `sync_source=moysklad` only
- [x] Category delete: guard subcategories + UI error feedback
- [x] Sidebar/dashboard UX for import queue
- [x] Cascading subcategory picker in import queue
- [x] Tests updated (`test_admin_catalog.py`, E2E smoke)

#### Feature: Storefront Variant Selector UX (ADR-011) — COMPLETED

- [x] ADR-011 accepted and indexed in `DECISIONS.md`
- [x] Migration `015_variant_selector_ux` — `product_images.option_color`
- [x] Backend `option_groups` + public gallery on product detail API
- [x] PDP `VariantSelector` — color swatches, size pills, OOS strikethrough
- [x] PDP gallery sync by `option_color`
- [x] PLP «От X ₽» + color dots; quick cart only for single-variant
- [x] Tests: `test_variant_options.py`, extended `test_variants.py`

#### Feature: Admin Panel UX Wave 1 — COMPLETED

- [x] Login `?from=` redirect after auth
- [x] Import queue: RU statuses, AdminPagination, mobile cards
- [x] Dashboard «Требует оформления» card
- [x] Catalog image alt text; inventory MS copy; customers noindex
- [x] Shared `admin-fetch.ts` + `form-styles.ts`
- [x] Dead code cleanup (AdminProductForm, createProductAction)

#### Feature: Admin Panel UX Wave 2 — COMPLETED

- [x] ADR-012 admin IA + merchandising workflow
- [x] Dashboard action center (sync errors, order exports)
- [x] Inventory read-only UI for MS-synced SKUs
- [x] Nav restructure + categories in sidebar
- [x] Product save without redirect + toast pattern

#### Feature: Admin Panel UX Wave 3 — COMPLETED

- [x] Admin gallery `option_color` field per image (ADR-011)
- [x] Color picker from variant attributes; upload default color
- [x] `updateProductImageAction` server action
- [x] Pytest: `test_admin_product_image_option_color`

#### Feature: Admin Panel Review & Wave 4 — COMPLETED

- [x] Inventory page read-only — no manual quantity adjust UI
- [x] `ADMIN_INVENTORY_MANUAL_ADJUST_ENABLED` env flag (default false)
- [x] Inventory SKU/name search (`GET /admin/inventory?q=`)
- [x] Viewer `customers:read` — clients page accessible
- [x] Permission gating on categories + MoySklad integration panels
- [x] Order detail «Экспорт в МойСклад» button
- [x] E2E `admin-inventory-smoke.spec.ts`
- [x] Pytest inventory + customers updated

#### Feature: Admin Panel UX Wave 5 — COMPLETED

- [x] `adminFetchResult` with RU error messages (401/403/500)
- [x] Orders filter `export_pending` (API + UI tab + dashboard deep link)
- [x] Orders table MoySklad export status badges
- [x] Import queue permission gating + merchandising checklist
- [x] E2E `admin-wave5-smoke.spec.ts`
- [x] Pytest `test_admin_list_orders_export_pending_filter`

#### Feature: Admin Panel UX Wave 6 — COMPLETED

- [x] Import queue bulk category assign (checkboxes + toolbar)
- [x] Admin login rate limit (10/min per IP)
- [x] Next.js middleware JWT validation (`jose` + `JWT_SECRET_KEY`)
- [x] Admin toast positioning fix (no mobile nav offset)
- [x] E2E `admin-wave6-smoke.spec.ts`
- [x] Pytest `test_admin_login_rate_limit_returns_429`

#### Feature: Admin Panel UX Wave 7 — COMPLETED

- [x] `needs_color_photos` catalog filter + MoySklad status count
- [x] Gallery color coverage panel + MS placeholder per missing color
- [x] Gallery reorder + alt-text editing
- [x] Import queue color checklist + bulk publish
- [x] Dashboard alert + catalog «Фото по цветам» tab
- [x] Storefront preview link on product edit
- [x] E2E `admin-wave7-smoke.spec.ts`
- [x] Pytest `test_admin_list_products_needs_color_photos_filter`

#### Admin UX — Bulk Publish Guard — COMPLETED

- [x] Domain `merchandising_readiness.py` (category, photo, color gallery)
- [x] API guard on PATCH `status=active` for MoySklad products
- [x] Frontend shared `merchandising-readiness.ts` + bulk publish skip summary
- [x] Pytest `test_merchandising_readiness.py` + publish guard API tests

#### Admin UX — Catalog List RBAC — COMPLETED

- [x] Hide «Изменить» / «Скрыть с витрины» / «Действия» column without `catalog:write`
- [x] Hide «+ Категория» on catalog landing for viewer
- [x] Hide button error feedback on API failure
- [x] Seed `viewer@example.com` + E2E smoke

#### Admin UX — Catalog Navigation — COMPLETED

- [x] Category column in product list (desktop + mobile)
- [x] `catalog-list-url.ts` shared list/edit/return URL helpers
- [x] Edit page contextual back link + `return_to` on save and close
- [x] Import queue edit links preserve import page context
- [x] E2E filter back-link smoke

#### Feature: Admin Panel UX Wave 14 — COMPLETED

- [x] `admin_bulk_jobs` table + migration 020
- [x] Bulk job API (`POST/GET /admin/jobs/bulk`) with progress counters
- [x] Background runner for assign category + publish products
- [x] `AdminBulkJobProgress` UI on import queue; polling + revalidation

#### Feature: Admin Panel UX Wave 13 — COMPLETED

- [x] Global command palette (`Cmd/Ctrl+K`) with RBAC-filtered navigation, search, quick views, MoySklad actions
- [x] `AdminForbiddenState` / `AdminFetchErrorState` on main admin pages
- [x] E2E command palette smoke

#### Feature: Admin Panel UX Wave 12 — COMPLETED

- [x] Customers list migrated to `AdminDataTable` (`admin-customers-table.tsx`)
- [x] MoySklad import queue migrated to `AdminDataTable` with selection + bulk toolbar
- [x] Search-aware empty states; `formatAdminDate` on customers

#### Feature: Admin Panel UX Wave 11 — COMPLETED

- [x] `GET /api/v1/admin/inventory/overview` — variant + product low/out-of-stock counts
- [x] Dashboard low-stock card wired to overview (product count, variant subtitle, grouped link)
- [x] Dashboard page uses `getAdminCatalogOverview()` for merchandising counts
- [x] Pytest `test_admin_inventory_overview` + OpenAPI sync (55 paths)

#### Feature: Admin Panel UX Wave 10 — COMPLETED

- [x] `GET /api/v1/admin/catalog/overview` — merchandising workflow counts
- [x] Catalog list migrated to `AdminDataTable` (`admin-catalog-table.tsx`)
- [x] Workflow page uses single overview API (replaces 7 list calls)
- [x] Saved views show counts from overview on catalog page
- [x] Pytest + OpenAPI sync

#### Feature: Admin Panel UX Wave 9 — COMPLETED

- [x] `AdminDataTable` foundation (sort, sticky header, column visibility, mobile cards)
- [x] `AdminEmptyState`, `AdminErrorState`, `AdminSavedViews`
- [x] Inventory API `group_by=product` + grouped UI (`InventoryProductGroup`)
- [x] Inventory saved views + orders table on AdminDataTable
- [x] Merchandising workflow board `/admin/catalog/workflow`
- [x] Catalog/orders/inventory saved view tabs
- [x] OpenAPI sync + pytest inventory grouped test

#### Feature: Admin Panel UX Wave 8 (P0 + Quick Wins) — COMPLETED

- [x] Sidebar nav full-width block links (desktop + mobile drawer)
- [x] Hydration fix — `formatAdminDate()` + MoySklad sync label
- [x] `AdminFilterChips` on catalog, orders, inventory
- [x] `AdminSearchBar` shared across catalog/orders/inventory/customers
- [x] Sticky save bar on product edit
- [x] `AdminConfirmDialog` for category delete
- [x] Toast severity tones (`success` / `warning` / `error` / `info`)

**Ops:** prod deploy for MS stock column + Wave 8 UI — **COMPLETED 2026-07-22** (deploy #32, migrations through 020)

#### Feature: Admin Catalog MS Stock Visibility — COMPLETED

- [x] Admin catalog API — variant inventory snapshot + product totals
- [x] Catalog list column «Остаток (МС)» with low-stock badge
- [x] Product edit variant panel — numeric stock (read-only)
- [x] Pytest + E2E smoke for stock column
- [x] OpenAPI sync

#### Feature: Remove Admin MFA — COMPLETED

- [x] ADR-014 — password-only admin auth
- [x] Remove MFA API routes, use cases, TOTP services
- [x] Migration 018 — drop MFA columns from `admin_users`
- [x] Frontend single-step login; remove `/admin/settings/security`
- [x] Update production env/docs (no `ADMIN_MFA_*`)
- [x] Admin panel full review (P0/P1/P2 findings)

#### Feature: Local Server Media Storage — COMPLETED

- [x] ADR-013 — local filesystem media on VPS; S3 backend removed
- [x] `MediaStorageService` local-only; presign endpoint removed
- [x] Production validators — `MEDIA_PUBLIC_BASE_URL` (https) required
- [x] `docker-compose.prod.yml` — `media_uploads` persistent volume
- [x] `docs/PRODUCTION-MEDIA-MFA.md` — local media + MFA workflow
- [x] Frontend direct upload via `POST /admin/media/upload`
- [x] Pytest: `test_production_config.py` (5 tests), upload size test

**Ops follow-up:**

- [ ] Set `MEDIA_PUBLIC_BASE_URL` in `.env.production` and redeploy
- [ ] Configure volume backup for `/app/uploads`

#### Feature: Production S3 + MFA Configuration — SUPERSEDED (ADR-013/014)

- [x] `.env.production.example` with S3, CDN, MFA variables
- [x] `docker-compose.prod.yml` — S3/MFA for API, JWT+CDN for web
- [x] Production validators — require S3 + CDN + MFA encryption key
- [x] `docs/PRODUCTION-S3-MFA.md` — Yandex/AWS setup + MFA enrollment workflow
- [x] `scripts/generate-production-secrets.sh`
- [x] `deploy.sh` preflight checks for S3/MFA env
- [x] Pytest: `test_production_config.py` (5 tests)

**Ops follow-up:**

- [ ] Create S3 bucket + CDN on cloud provider (superseded — local media per ADR-013)
- [ ] Fill `.env.production` on server and deploy

#### Feature: Admin P3 Hardening + Dev DB Ops — COMPLETED

- [x] Migrations 014–017 applied on dev Postgres
- [x] Image URL allowlist validation (`https`/`http`, block `javascript:`/`data:`)
- [x] Magic-byte validation on media uploads
- [x] MoySklad sync 502 responses sanitized (server-side logging only)
- [x] Pytest: `test_admin_media_validation.py` (5 tests)

#### Feature: Admin P2 Hardening (post-MFA review) — COMPLETED

- [x] Fix flaky `test_admin_search_products_by_name`
- [x] API regression: MFA routes return 404
- [x] E2E viewer RBAC smoke (`admin-rbac-smoke.spec.ts`)
- [x] Customers search placeholder UX
- [x] Multi-replica rate limit documented (Redis deferred)

#### Feature: Admin P2 Hardening — COMPLETED

- [x] S3 presign `ContentLength` + `media_max_upload_bytes` validation
- [x] `React cache()` on `getCurrentAdmin` / dashboard / MFA status (dedupe `/me`)
- [x] MFA regenerate backup codes + disable API
- [x] MFA UI — QR code, regenerate, disable/re-enroll
- [x] Pytest: presign size + MFA disable/regenerate (11/11 MFA green)

#### Feature: Admin P1 Hardening (post-MFA review) — COMPLETED

- [x] Page-level RBAC on orders, inventory, customers, catalog write pages
- [x] Login action distinguishes 401/403/429/5xx
- [x] OpenAPI sync via `scripts/export_openapi.py` (53 paths, admin catalog detail routes)
- [x] Removed stale MoySklad category-mappings from contract

#### Feature: Admin P1 Hardening — COMPLETED

- [x] MFA refresh UX — server-detect pending cookie on login page
- [x] `requireAdminPermission()` helper for server actions
- [x] Permission checks on catalog, orders, MoySklad mutations
- [x] Permission-aware sidebar nav (`filterAdminNavSections`)

#### Feature: Admin P0 Security (post-MFA) — COMPLETED

- [x] Migration 019 — login lockout columns on `admin_users`
- [x] DB account lockout after N failed attempts (429 + Retry-After)
- [x] Optional IP allowlist (`ADMIN_LOGIN_ALLOWED_IPS`)
- [x] Rate limit `POST /admin/media/upload`
- [x] JWT `is_active` claim — API + Next.js middleware
- [x] Frontend login messages for 429/403
- [x] Pytest: lockout, IP allowlist, upload limit, legacy JWT rejection (13/13 admin auth green)

#### Feature: Admin P0 Security Hardening (MFA era) — SUPERSEDED

- [x] MFA state machine — enroll preserves `mfa_enabled`; pending secret requires MFA at login
- [x] Enforce `ADMIN_MFA_REQUIRED` at login (403 when not enrolled)
- [x] Rate limit `POST /admin/auth/mfa/verify` (10/min/IP)
- [x] Production JWT fail-hard — no dev secret fallback in middleware
- [x] Pytest: 4 new MFA security tests (16/16 green)

#### Feature: Admin Production Hardening — COMPLETED

- [x] Migration 017 — admin MFA fields (`mfa_enabled`, encrypted TOTP secret, backup codes)
- [x] Admin TOTP MFA — login challenge, enroll/confirm API, backup codes
- [x] Frontend — MFA step on login, `/admin/settings/security` enrollment UI
- [x] S3 media storage backend + `POST /admin/media/presign` for direct browser upload
- [x] Local `/media` upload preserved as default (`media_storage_backend=local`)
- [x] Pytest: `test_admin_mfa.py` (MFA challenge, enroll/confirm, presign 409 on local)
- [x] `.env.example` — MFA + S3/CDN settings documented

**Ops follow-up (not code):**

- [x] Run `alembic upgrade head` on dev DB (014–017) — requires Docker/Postgres
- [ ] Upload real product/category photography via admin gallery

---

## Technical Tasks

**Status:** IN_PROGRESS

- [x] Alembic setup and initial migration
- [x] API pytest baseline (health + catalog)
- [x] CI pipeline (lint, test, build) — `.github/workflows/ci.yml`
- [x] Playwright E2E baseline — `apps/web/e2e/homepage.spec.ts`
- [x] `.cursorignore` for `node_modules` (per ADR-001 consequence)

---

## Epic: Comprehensive Audit 2026-07-23

**Status:** COMPLETED

### Feature: Multi-Agent Store Audit + Unified Roadmap

**Status:** COMPLETED (2026-07-23)

- [x] Round 1 — 10 parallel specialist audits (architecture, backend, frontend, catalog, checkout, database, security, QA, devops, API)
- [x] Round 2 — Synthesis: themes, contradictions, deduplicated P0/P1, Waves 0–4 roadmap
- [x] Round 3 — Verifier PASSED WITH NOTES
- [x] Deliverable: `docs/reviews/COMPREHENSIVE-AUDIT-2026-07-23.md`
- [x] PM state updated

**Follow-up execution (from roadmap):**
- [ ] Wave 0 — Immediate ops (deploy, MS stock verify, media volume, CI deploy gate)
  - [x] 0.6 Gate deploy on CI success (`deploy.yml` workflow_run + concurrency)
  - [x] 0.7 Customer auth rate limits (`CheckoutRateLimitMiddleware`)
  - [x] 0.8 Media 500 leak fix + remove duplicate `SyncProtectedFieldError`
  - [x] deploy.sh preflight (TRUSTED_PROXY_HOPS warn, MEDIA https) + post-deploy smoke + media volume check
  - [ ] 0.1 Prod deploy pending fixes (push master → CI → deploy)
  - [ ] 0.2 Verify MOYSKLAD_STORE_ID + «Обновить остатки»
  - [ ] 0.3 Verify media_uploads volume on prod (automated in deploy.sh)
  - [ ] 0.4 Re-upload 404 gallery URLs
  - [ ] 0.5 Confirm TRUSTED_PROXY_HOPS=1 + MEDIA_PUBLIC_BASE_URL on prod server
- [ ] Wave 1 — Release gate (YooKassa, SMTP, fulfillment gaps)
- [ ] Wave 2 — Domain hardening (stock truth, catalog boundaries, backups)
- [ ] Wave 3 — Growth & quality (SEO, design system, OpenAPI maturity)
- [ ] Wave 4 — Scale preparation (backlog)

---

## Epic: Full Project Review Follow-ups

**Status:** BACKLOG (from review 2026-07-21; superseded in part by COMPREHENSIVE-AUDIT-2026-07-23)

### QA Audit (2026-07-23) — BACKLOG

- [ ] YooKassa test-mode E2E + notification webhook pytest (release gate)
- [ ] Post-deploy prod smoke workflow (GitHub Actions or deploy.sh hook)
- [ ] CI: pytest subset on PostgreSQL service (parity with E2E)
- [ ] CI: pytest-cov threshold on domain/application layers
- [ ] E2E: auth register/verify, out-of-stock checkout, MS order export button
- [ ] Remove or replace conditional `test.skip` in admin MS smokes (stable seed)

### P0 — Release blockers

- [ ] YooKassa payment integration (replace Stripe foundation per ADR-004)
- [x] Run migrations 018–020 on production DB (via deploy #32 entrypoint)
- [x] Update checkout E2E to fill shipping form (migration 016)

### P1 — Security & architecture

- [x] Fix X-Forwarded-For parsing for admin IP allowlist and rate limits
- [x] Require `MOYSKLAD_WEBHOOK_SECRET` in production config validator
- [x] Production validator: reject default admin credentials
- [ ] Move `ProductImageModel` from moysklad to catalog module
- [x] Delete orphan MFA files (`admin_mfa_crypto.py`, `test_admin_mfa.py`, untracked use cases)
- [x] Consolidate duplicate ADR-008; deprecate orphan file
- [x] PM cleanup: remove MFA ops follow-ups; collapse Sprint E duplicates in TASKS.md
- [ ] Shipping in MoySklad order export payload
- [x] CI: alembic upgrade head job + OpenAPI drift check

### P2 — Polish

- [ ] Shipping fields in public `OrderDetailSchema`
- [x] Zod validation on checkout shipping form (stich parity 2026-07-24)
- [ ] Global security headers (CSP/X-Frame-Options beyond checkout)
- [ ] Media backup runbook for `media_uploads` volume
- [ ] SMTP production delivery

---

## Bugs

### BUG: Storefront — корзина, SKU, фото товара

**Status:** COMPLETED (code fix 2026-07-23; prod deploy pending)

- [x] Cart badge on header + mobile nav; refresh via `cart:updated` event
- [x] Hide SKU row on PDP characteristics + purchase panel
- [x] Product image fallback (`image_url` → gallery → `erp_image_url`); `/media/` URL resolution
- [x] PLP/search API batch-load gallery for `image_url` resolution (list/search routes)
- [x] Pytest: `test_product_serializers.py` (5 tests)
- [ ] Deploy to prod

---

### BUG: Admin product save — «Ошибка сервера» для товаров МойСклад

**Status:** COMPLETED (code fix 2026-07-23; prod deploy pending)

- [x] Fix `SyncProtectedFieldError` import in catalog admin_router (sync_guard)
- [x] Omit `currency` from PATCH for `sync_source=moysklad` in frontend
- [x] Pytest: display fields save → 200; currency → 422
- [ ] Deploy to prod

---

### BUG: MoySklad stock sync — везде 0 шт. в админке

**Status:** COMPLETED (code fix 2026-07-23; prod deploy + stock pull pending)

- [x] Normalize MOYSKLAD_STORE_ID (UUID from URL)
- [x] Stock report: groupBy=variant + store filter
- [x] Robust assortment ID parsing (meta + assortment.meta)
- [x] Skip variants missing from MS map (no destructive zero)
- [x] Fix pagination offset in stock sync
- [x] Pytest: `test_moysklad_stock_sync.py` (7 tests)
- [ ] Deploy to prod
- [ ] Ops: verify MOYSKLAD_STORE_ID + run «Обновить остатки»

---

### BUG: Admin media upload — video error + photos not displayed on prod

**Status:** COMPLETED (code fix 2026-07-22; prod deploy + re-upload pending)

- [x] Return `/media/{file}` relative URLs from upload API
- [x] Verify file on disk after write
- [x] Reject video with clear RU message
- [x] Fix admin gallery preview (`productImageRenderProps`, unoptimized `/media/*`)
- [x] Pytest: upload + StaticFiles serve + video rejection
- [ ] Deploy to prod
- [ ] Ops: verify `media_uploads` Docker volume
- [ ] Re-upload photos for products with 404 gallery URLs

---

## Improvements (previous)

**Status:** COMPLETED

- [x] Admin Panel UX Improvement Plan saved to `docs/reviews/ADMIN-PANEL-UX-IMPROVEMENT-PLAN-2026-07-22.md`
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
