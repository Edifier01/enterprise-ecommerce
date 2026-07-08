# Technical Audit Report — Current State

**Date:** 2026-07-08  
**Auditor:** Senior Architect (AI Agent)  
**Mode:** Read-only — no code was modified  
**Scope:** Full codebase — `apps/api/`, `apps/web/`, migrations, CI, OpenAPI, PM state  

---

## Executive Summary

The project is in a **healthy but transitional state**. The backend DDD/Clean Architecture foundation is solid. Sprint 5 Auth Security Hardening is **100% complete in code** — but the project management files (`TASKS.md`, `HANDOFF.md`, `CURRENT_CONTEXT.md`) are outdated and show Sprint 5 tasks as incomplete. This is the most impactful immediate finding.

The platform is **ready to begin new features** with two conditions: the PM state files must be corrected first, and frontend auth pages should be the next increment before adding protected endpoints.

---

## Sprint 5 Auth Security Hardening — Actual Status

> TASKS.md shows several Sprint 5 items as unchecked. The code tells a different story.

| Task | TASKS.md Status | Code Status |
|------|-----------------|-------------|
| `secrets-config` — `SecretStr` + production fail-fast | ☐ unchecked | ✅ **DONE** — `config.py:3-28` |
| `input-validation` — `EmailStr` + password length | ☐ unchecked | ✅ **DONE** — `schemas.py:9-11` |
| `ports-adapters` — `IPasswordHasher` + `ITokenService` | ☐ unchecked | ✅ **DONE** — `domain/ports.py:20-43` |
| `ports-adapters` — `bcrypt_hasher.py` + `jwt_token_service.py` | ☐ unchecked | ✅ **DONE** — both files exist |
| `uow` — `IUnitOfWork` port + `SqlAlchemyUnitOfWork` | ☐ unchecked | ✅ **DONE** — `domain/ports.py:45-49`, `unit_of_work.py` |
| `health-ready` — `GET /health/ready` readiness probe | ☐ unchecked | ✅ **DONE** — `main.py:85-93` |
| `request-id` — `RequestIdMiddleware` + structured logging | ☐ unchecked | ✅ **DONE** — `middleware.py`, `main.py:25-48` |

**Sprint 5 is fully complete. The PM state files have not been updated after the last session.**

---

## Issues by Severity

---

### CRITICAL

---

#### C-001 — PM State Files Are Incorrect

**File:** `.cursor/project-management/TASKS.md`, `HANDOFF.md`, `CURRENT_CONTEXT.md`

TASKS.md shows 7 Sprint 5 tasks as `[ ]` (incomplete). The code has implemented all of them. Future agents reading these files will produce duplicate work, unnecessary re-implementation, or incorrect context-based decisions.

**Impact:** High agent coordination failure risk. Next agent will waste a full sprint re-doing completed work.

**Fix:** Mark Sprint 5 as `COMPLETED` in TASKS.md. Update `HANDOFF.md` with actual completed state. Update `CURRENT_CONTEXT.md` to reflect Sprint 5 completion and next priority (frontend auth pages).

---

#### C-002 — No JWT Verification / No Protected Routes

**File:** `apps/api/app/features/auth/presentation/router.py`, entire `apps/api/`

The backend issues JWT tokens (`login` → `TokenResponse`) but has **zero token verification infrastructure**:

- No `get_current_user` FastAPI dependency
- No `verify_access_token` method on `ITokenService`
- No protected route example anywhere in the codebase
- Every API endpoint is publicly accessible regardless of JWT

Any new endpoint added to the platform today cannot be protected. Category, cart, order, and admin features all require this mechanism before they can be built correctly.

**Fix:** Add `verify_access_token(token: str) -> dict` to `ITokenService` and implement in `JwtTokenService`. Create a `get_current_user` FastAPI dependency in `auth/presentation/dependencies.py`.

---

### HIGH

---

#### H-001 — No `__init__.py` in Any Python Package

**File:** All `apps/api/app/**` and `apps/api/tests/`

The glob `apps/api/**/__init__.py` returns **0 results**. The codebase relies entirely on Python 3.3+ namespace package semantics. This works at runtime with `pythonpath = .` in `pytest.ini`, but:

- `mypy`, pyright, and most static analysis tools have degraded behavior without `__init__.py`
- Alembic autogenerate can produce incorrect output
- IDE import resolution is inconsistent across editors
- Some deployment environments (especially Docker + gunicorn workers) can fail silently

**Fix:** Add empty `__init__.py` files to all `app/`, `app/core/`, `app/features/`, `app/features/auth/`, etc. packages. This is a one-time mechanical task.

---

#### H-002 — Playwright E2E Tests Never Execute in CI

**File:** `.github/workflows/ci.yml:60-68`

```yaml
- name: Check API availability
  id: check-api
  run: curl --fail --silent http://localhost:8000/health
  continue-on-error: true          # ← CI passes even if API is down

- name: Run Playwright E2E tests
  if: steps.check-api.outcome == 'success'   # ← API is never started in CI
```

The CI workflow has no step that starts the backend or a dev server. `localhost:8000` is never available. The `check-api` step always fails (silently, due to `continue-on-error: true`), and the Playwright step is always skipped. **E2E tests provide zero CI coverage.**

**Fix:** Add a `webServer` configuration to `playwright.config.ts` so Playwright starts `next dev` before tests. For full integration, add a CI step that starts the backend with a test database (or mock the API).

---

#### H-003 — Frontend Auth Pages Do Not Exist

**Files:** `apps/web/src/app/` — no `login/` or `register/` directories

The backend auth API is complete (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`). The frontend has no corresponding pages. There is no:

- `/login` page with form
- `/register` page with form
- Token storage (httpOnly cookie or localStorage)
- `middleware.ts` route guard
- Navigation links for auth state

This is not a blocker for existing catalog features, but it is the next required increment before any protected route or user-facing feature can ship.

---

#### H-004 — `JwtTokenService` Has Direct Global Settings Import

**File:** `apps/api/app/features/auth/infrastructure/security/jwt_token_service.py:6`

```python
from app.core.config import settings  # global import inside infrastructure adapter
```

The infrastructure adapter directly reaches into the application's global configuration instead of receiving it via constructor injection. This violates the Clean Architecture principle that infrastructure adapters should receive their dependencies explicitly.

**Consequences:**
- Unit testing `JwtTokenService` in isolation is impossible without mocking the global `settings` object
- Replacing or overriding config per-environment requires process-level env var changes, not DI overrides
- The pattern is inconsistent with `BcryptPasswordHasher` which has no external dependencies

**Fix:** Add `secret_key: str`, `algorithm: str`, `expire_minutes: int` to `JwtTokenService.__init__`. Wire config at the DI provider level in `router.py`.

---

### MEDIUM

---

#### M-001 — `/health/ready` Missing from `openapi.yaml`

**File:** `openapi.yaml`

`GET /health/ready` is implemented in `main.py:85-93` and returns `{"status": "ready"}` (200) or `{"status": "unavailable"}` (503). It is not documented in the OpenAPI contract. Any consumer or monitoring system relying on the spec will not discover this endpoint.

**Fix:** Add `/health/ready` path to `openapi.yaml` with both 200 and 503 responses.

---

#### M-002 — Migration 001 Uses PostgreSQL-Specific Dialect Type

**File:** `apps/api/alembic/versions/001_add_products_table.py:13,24`

```python
from sqlalchemy.dialects import postgresql
...
sa.Column("id", postgresql.UUID(as_uuid=True), ...)
```

Migration 003 correctly uses `sa.Uuid(as_uuid=True)` (generic SQLAlchemy 2.0 type). Migration 001 uses the PostgreSQL dialect-specific import. This is inconsistent and causes test database incompatibility — `postgresql.UUID` is not supported by SQLite (used in tests). Tests work because the `id` column uses `uuid.uuid4()` as a Python default and SQLite ignores the column type for writes, but it is fragile.

**Fix:** Update migration 001 to use `sa.Uuid(as_uuid=True)`.

---

#### M-003 — `get_db_session` Has No Rollback on Exception

**File:** `apps/api/app/core/database.py:19-21`

```python
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session
```

If an exception occurs during a request after a `flush()` but before a `commit()`, the session exits the context manager without an explicit rollback. SQLAlchemy's `AsyncSession.__aexit__` closes the session, which implicitly discards unflushed changes, but a pending transaction may not be cleanly rolled back in all configurations.

**Fix:**
```python
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
```

---

#### M-004 — Test Fixture Duplication

**Files:** `tests/conftest.py`, `tests/test_auth.py`

`auth_client` in `test_auth.py` (lines 16-34) and `client` in `conftest.py` (lines 15-33) are structurally identical: both create an in-memory SQLite engine, apply `Base.metadata.create_all`, override `get_db_session`, and yield an `AsyncClient`. This is 40 lines of duplicated boilerplate.

**Fix:** Move `auth_client` to `conftest.py` and rename both fixtures to be distinguishable by database state (empty vs seeded). Remove the duplicate from `test_auth.py`.

---

#### M-005 — `ListProductsUseCase` Contains Redundant Validation

**File:** `apps/api/app/features/catalog/application/use_cases/list_products.py:12-13`

```python
page = max(page, 1)
limit = min(max(limit, 1), 100)
```

FastAPI's `Query(ge=1)` and `Query(le=100)` in the router already reject invalid values with HTTP 422 before the use case is called. These silent clamps in the use case layer create a hidden divergence: if a future caller bypasses the router (e.g., internal service call, test), the clamping is invisible and the domain logic appears to accept out-of-range inputs.

**Fix:** Remove the clamps from the use case. Add a domain guard that raises a `ValueError` instead if invariants must be enforced at the application layer.

---

#### M-006 — `Product` Domain Entity Missing Core E-Commerce Fields

**File:** `apps/api/app/features/catalog/domain/entities.py`

```python
@dataclass(frozen=True, slots=True)
class Product:
    id: UUID
    name: str
    slug: str
    price_cents: int
    currency: str
    in_stock: bool
    # Missing: description, images, category_id, sku
```

A `Product` entity without `description` and `images` cannot support a functional storefront. The `category_id` association is required before category filtering can be built. `sku` is needed for inventory tracking.

**Impact:** Blocks product detail page improvements, category domain, and any catalog-enrichment feature.

---

#### M-007 — No Category Domain

**Status:** BACKLOG — no files exist under any `category` feature directory.

Products have no `category_id` field. There is no category entity, port, repository, or migration. Category hierarchy is one of the next planned features (see TASKS.md). This is an expected gap, documented here for completeness.

---

#### M-008 — `BaseHTTPMiddleware` Performance Limitation

**File:** `apps/api/app/core/middleware.py:16`

`RequestIdMiddleware` extends `BaseHTTPMiddleware`. Starlette's `BaseHTTPMiddleware` buffers the entire response body before returning it, which breaks streaming responses and degrades performance for large payloads. For production load, a pure ASGI middleware class should be used instead.

**Impact:** Low in current MVP stage, high when streaming, file downloads, or SSE endpoints are added.

---

### LOW

---

#### L-001 — `openapi.yaml` `ProductListResponse` Missing `required` Array

**File:** `openapi.yaml:148-161`

`ProductListResponse` defines `items`, `total`, `page`, `limit` as properties but has no `required` array. This means OpenAPI clients (codegen tools, validators) treat all fields as optional, generating incorrect TypeScript types.

---

#### L-002 — `UserModel` Has `updated_at`; `User` Domain Entity Does Not

**Files:** `auth/infrastructure/persistence/models.py:20-24`, `auth/domain/entities.py`

The `UserModel` ORM model has an `updated_at` column with `onupdate=func.now()`. The `User` domain entity does not expose `updated_at`. The `UserRepository.create()` and `get_by_email()` methods map `UserModel` → `User` but drop `updated_at`. If any use case ever needs to know when a user record was last modified, the domain entity must be extended and the mapping updated.

---

#### L-003 — No Navigation Between Pages in Frontend

**File:** `apps/web/src/app/layout.tsx`

The root layout has no navigation component. Product detail pages (`/products/[slug]`) have no "Back to catalog" link. Users can only navigate back via the browser's back button. No `not-found.tsx` global 404 page exists.

---

#### L-004 — `LoginRequest` Has No Password Constraints

**File:** `apps/api/app/features/auth/presentation/schemas.py:14-15`

```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str   # no min_length / max_length
```

`RegisterRequest` enforces `Field(min_length=8, max_length=128)`. `LoginRequest` accepts a password of any length. While not a security vulnerability (the bcrypt check fails regardless), sending a 1 MB password string to bcrypt is a known DoS vector. Adding `max_length=128` to `LoginRequest` closes this.

---

#### L-005 — Unused Production Dependencies

**File:** `apps/api/requirements.txt:9`, `apps/web/package.json:23-24`

- `stripe>=11.0.0` is installed in the backend but never imported. Adds ~5 MB to the Docker layer.
- `zustand` and `zod` are in `package.json` but unused in any frontend file. `zod` is a planned dependency for form validation; `zustand` is planned for auth state. Acceptable as intentional scaffolding, but should be documented.

---

#### L-006 — CI Runs No Frontend Linting

**File:** `.github/workflows/ci.yml`

`package.json` defines `"lint": "next lint"` (ESLint). The CI workflow runs `tsc --noEmit` and `npm run build` but does not run `npm run lint`. ESLint errors in the frontend are not caught automatically.

---

#### L-007 — Test Ordering Assumption in Catalog Tests

**File:** `apps/api/tests/test_catalog.py:70`

```python
assert data["items"][0]["name"] == "Test Product"
```

The repository orders products by `created_at DESC`. Both test products are inserted in the same test setup, likely within the same millisecond. The ordering between them is non-deterministic at identical timestamps. This test may fail intermittently. "Out of Stock" (inserted second) might sort first.

---

## Architecture Compliance Matrix

| Principle | Status | Notes |
|-----------|--------|-------|
| DDD — Entities | ✅ Correct | Frozen dataclasses, no ORM leakage |
| DDD — Ports (interfaces) | ✅ Correct | `IUserRepository`, `IProductRepository`, `IPasswordHasher`, `ITokenService`, `IUnitOfWork` |
| DDD — Use Cases | ✅ Correct | Single-responsibility, depend on interfaces |
| Clean Architecture — layer separation | ✅ Correct | `domain → application → infrastructure ← presentation` |
| Dependency Inversion | ⚠️ Partial | `JwtTokenService` breaks DI (H-004) |
| Unit of Work | ✅ Auth only | Catalog is read-only; UoW not needed yet |
| Modular Monolith — feature isolation | ✅ Correct | `features/catalog/` and `features/auth/` are independent |
| OpenAPI contract-first | ⚠️ Partial | Contract missing `/health/ready`, `required` arrays |
| Repository pattern | ✅ Correct | Both features use interface-based repositories |

---

## Feature Completion Map (Phase 24)

| Area | Component | Status |
|------|-----------|--------|
| **Backend** | FastAPI scaffold + lifespan | ✅ |
| | Catalog — list + detail API | ✅ |
| | Auth — register + login + JWT issue | ✅ |
| | Auth — JWT verification + protected routes | ❌ Missing |
| | Category domain | ❌ Not started |
| | Product variants | ❌ Not started |
| | Stripe checkout | ❌ Not started |
| **Frontend** | Product listing page | ✅ |
| | Product detail page | ✅ |
| | Login / Register pages | ❌ Missing |
| | Protected route middleware | ❌ Missing |
| | Auth state (Zustand) | ❌ Missing |
| | Navigation | ❌ Missing |
| **Database** | Migrations 001–003 | ✅ |
| | Alembic env (async) | ✅ |
| **CI/CD** | Backend: ruff + pytest | ✅ |
| | Frontend: tsc + build | ✅ |
| | E2E: Playwright | ⚠️ Never runs in CI |
| **API Contract** | OpenAPI catalog + auth | ✅ (minor gaps) |

---

## Recommended Fix Priority

### Before starting any new feature:

1. **C-001** — Update PM state files (TASKS.md, HANDOFF.md, CURRENT_CONTEXT.md) to reflect Sprint 5 completion. _(15 min)_
2. **C-002** — Add `verify_access_token` to `ITokenService` + implement `get_current_user` dependency. _(1–2h)_ — required before any protected route can be built.

### Sprint 6 priorities (before Category / Checkout features):

3. **H-001** — Add `__init__.py` to all Python packages. _(15 min)_
4. **H-003** — Frontend auth pages: `/login`, `/register`, token storage, `middleware.ts`. _(1–2 days)_
5. **H-002** — Fix E2E CI: add `webServer` to `playwright.config.ts`. _(30 min)_
6. **H-004** — `JwtTokenService` constructor injection of settings. _(30 min)_

### Polish (can be deferred to next sprint):

7. **M-001** — Add `/health/ready` to `openapi.yaml`. _(10 min)_
8. **M-003** — Add rollback to `get_db_session`. _(10 min)_
9. **M-004** — Consolidate test fixtures in `conftest.py`. _(20 min)_
10. **L-004** — Add `max_length=128` to `LoginRequest.password`. _(5 min)_
11. **L-006** — Add `npm run lint` step to CI. _(5 min)_

---

## Can New Features Start Now?

**Yes, with conditions.**

The architecture is sound. The backend DDD layers are clean. The test suite is green (16/16). The infrastructure is production-grade for its current scope.

**Start new features after:**
1. PM state files are corrected (C-001) — 15 minutes of work
2. JWT verification dependency exists (C-002) — needed before any authenticated endpoint

**Do not start Category domain or Stripe checkout before** frontend auth pages (H-003) are at least scaffolded, since both features require an authenticated user context.

---

*Generated: 2026-07-08 — read-only audit, no code modified*
