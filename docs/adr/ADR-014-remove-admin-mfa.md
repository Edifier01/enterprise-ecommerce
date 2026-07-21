# ADR-014: Remove Admin MFA

## Status

Accepted — 2026-07-21

## Context

Admin TOTP MFA was implemented for production hardening (migration 017, enroll/confirm
API, login challenge, `/admin/settings/security`). The deployment target is a single
VPS operated by a small team. MFA adds operational friction (enrollment, backup codes,
device loss) without a current business requirement.

## Decision

1. **Remove admin MFA entirely** — no TOTP, no backup codes, no pending login tokens.
2. Admin login returns JWT immediately after email + password validation.
3. Migration `018_remove_admin_mfa` drops MFA columns from `admin_users`.
4. Remaining auth controls: separate `admin_users` table, RBAC, admin JWT scope,
   login rate limit (10/min/IP), HTTPS, production JWT secret validation.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| Keep MFA optional | User decision to abandon MFA completely |
| Keep DB columns dormant | Dead schema; migration cleanup is cleaner |
| Move MFA to external IdP | Out of scope; no IdP integration planned |

## Consequences

- Positive: simpler login and ops; no enrollment workflow before go-live.
- Negative: admin accounts protected by password + JWT only — enforce strong
  passwords and protect `JWT_SECRET_KEY`.

## Related

- Supersedes MFA production requirement from admin hardening (2026-07-20).
- ADR-007 (MFA deferred to production) — MFA path removed, not deferred.
- `docs/PRODUCTION-MEDIA.md`
