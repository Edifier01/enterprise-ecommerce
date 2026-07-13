# ADR-007: Admin Panel Architecture

## Status

Accepted

## Date

2026-07-09

## Context

Phase 24 delivered a customer-facing storefront with catalog, checkout, inventory,
search, and order history. Operations staff need a separate backoffice to manage
catalog, stock, and orders without sharing customer credentials or JWT scope.

Project rules (`ecommerce/00-ecommerce`, `security/01-auth`, `frontend/03-routing`)
already define:

- API namespace `/api/v1/admin/*` with Admin JWT + RBAC
- Frontend route group `/admin/*` with protected layout
- MFA for production admin accounts (deferred implementation hook)

Sprint A establishes the foundation: admin identity, auth, layout shell, and a
read-only dashboard. CRUD modules follow in Sprints B–D.

## Decision Drivers

- Admin and customer identities must not share a table or JWT scope.
- Customer tokens must not authorize admin endpoints; admin tokens must not
  impersonate customers.
- RBAC must be enforced server-side on every admin mutation (default deny).
- Dashboard metrics are read-only cross-context queries — acceptable for admin
  reporting without violating checkout write invariants.
- MFA is required before production admin use but must not block Sprint A delivery.

## Decision

### 1. Separate admin identity

Introduce `admin_users` table and `AdminUser` entity — not roles on `users`.

### 2. Admin JWT claims

Admin access tokens include:

```json
{
  "sub": "admin_uuid",
  "email": "admin@example.com",
  "scope": "admin",
  "role": "superadmin",
  "permissions": ["admin:read", "catalog:write", ...],
  "exp": 1234567890
}
```

Customer `ITokenService` remains unchanged. Admin uses `AdminJwtTokenService` in
the admin feature infrastructure.

### 3. RBAC roles (Sprint A)

| Role | Permissions |
|------|-------------|
| `superadmin` | `admin:read`, `catalog:write`, `inventory:write`, `orders:write`, `customers:read` |
| `viewer` | `admin:read` |

`require_permission("admin:read")` dependency guards all Sprint A admin routes.

### 4. API surface (Sprint A)

```
POST /api/v1/admin/auth/login
GET  /api/v1/admin/auth/me
GET  /api/v1/admin/dashboard/summary   # requires admin:read
```

Future sprints add `/api/v1/admin/catalog/*`, `/inventory/*`, `/orders/*`.

### 5. Frontend structure

```
apps/web/src/app/admin/
  login/page.tsx              # public
  (panel)/
    layout.tsx                # Sidebar + header
    page.tsx                  # Dashboard
```

Separate httpOnly cookie: `admin_access_token` (path `/admin`).

Middleware guards `/admin/*` except `/admin/login`.

### 6. MFA

Production admin accounts will require TOTP MFA per `security/01-auth`. Sprint A
documents the hook; TOTP enrollment is a pre-production hardening task.

## Consequences

### Positive

- Clear security boundary between storefront and backoffice.
- RBAC model scales to Sprints B–D without auth rework.
- Dashboard unblocks operational visibility before CRUD modules ship.

### Negative

- Two login flows and cookies to maintain.
- Cross-context dashboard queries need careful read-only repository design.
- MFA not implemented in Sprint A — must gate production deployment.

## Related Decisions

- ADR-001: Monorepo Structure
- ADR-004: YooKassa deferred (admin panel does not depend on payment provider)
