# Auth Flows Review — Registration, Email Verification, Password Reset

**Date:** 2026-08-10  
**Scope:** Retail/wholesale registration, email verification, resend verification, forgot/reset password, email delivery  
**Method:** Parallel specialist review (security-auditor, backend-engineer, frontend-engineer, silent-failure-hunter, qa-engineer)  
**Verdict:** ⚠️ **PASSED WITH NOTES** — architecture is sound; **production email delivery is not ready**; several P1 security/UX gaps before release gate.

---

## Executive Summary

The auth module follows Clean Architecture: thin router, domain use cases, hashed single-use tokens, anti-enumeration on forgot/resend, constant-time login. **Happy-path pytest coverage is solid (20 tests).**

**Release blockers:**

1. **SMTP not implemented** — `SmtpEmailService` raises `NotImplementedError`; production defaults to `EMAIL_PROVIDER=console`, which logs emails but delivers nothing.
2. **Split transaction on register** — user row commits before verification email; email failure → 500 + orphan unverified account (409 on retry).
3. **Email sent before token commit** — inverse failure: user gets link, DB rolls back.

**High-priority follow-ups:** JWT not invalidated after password reset; wholesale/reset missing password confirm; verify-email failure UX; zero E2E customer auth flows; `/resend-verification` untested.

---

## Architecture Snapshot

| Flow | Endpoints | Frontend |
|------|-----------|----------|
| Retail register | `POST /auth/register` | `/register` → `/register/check-email` |
| Wholesale register | `POST /auth/register/wholesaler` | `/register/wholesale` → check-email |
| Verify email | `POST /auth/verify-email` | `/verify-email?token=` (SSR calls API) |
| Resend verification | `POST /auth/resend-verification` | check-email card, login 403 block |
| Forgot password | `POST /auth/forgot-password` | `/forgot-password` |
| Reset password | `POST /auth/reset-password` | `/reset-password?token=` |

**Token model:** `secrets.token_urlsafe(32)` in URL → SHA-256 hash in `auth_tokens`; single-use; expiry (verify 24h, reset 1h); prior tokens revoked on reissue.

**Rate limits (per IP, in-memory):** login 5, register 3, forgot 3, resend 3, reset 5, verify 10 req/min.

---

## Findings — P0 (Release Blockers)

### P0-1. SMTP adapter is a stub; console allowed in production

| Field | Detail |
|-------|--------|
| **Location** | `smtp_email_service.py:10-16`, `dependencies.py:49-52`, `.env.production.example`, `config._validate_production_secrets` |
| **Issue** | `SmtpEmailService.send()` always raises `NotImplementedError`. Prod example uses `EMAIL_PROVIDER=console`. No production validator rejects console/stub email. |
| **Impact** | Registration appears to succeed; UI redirects to “check email”; **no email delivered**. Enabling `smtp` without implementation → 500 after DB work. |
| **Fix** | Implement SMTP (or transactional provider); fail-fast in production if `email_provider != smtp` with working send; validate `storefront_url` (HTTPS) and `email_from`. |

### P0-2. Register: user committed before verification email

| Field | Detail |
|-------|--------|
| **Location** | `register_user.py:46`, `router.py:96-107`, same for wholesaler |
| **Issue** | `RegisterUserUseCase` commits user; then `SendEmailVerificationUseCase` runs in a second transaction. Email failure → HTTP 500, user exists unverified. |
| **Impact** | Retry register → 409 “email already registered”; user stuck unless they discover resend-verification. |
| **Fix** | Orchestrate as one use case: user + token in one TX, commit, then send email (best-effort/outbox). Return 201 even if email queued; never 500 with committed user. |

### P0-3. Email sent before DB commit (token rollback)

| Field | Detail |
|-------|--------|
| **Location** | `send_email_verification.py:47-64`, `forgot_password.py:47-66` |
| **Issue** | `email_service.send()` awaited before `uow.commit()`. |
| **Impact** | Send succeeds, commit fails → user receives link to non-existent token. |
| **Fix** | Commit token first, then send email (or outbox pattern). |

### P0-4. SMTP failure creates enumeration oracle on forgot-password

| Field | Detail |
|-------|--------|
| **Location** | `forgot_password.py:32-66`, `smtp_email_service.py` |
| **Issue** | Unknown/unverified email → silent 200. Verified email + send failure → **500**. Attacker can distinguish account existence. |
| **Impact** | Defeats anti-enumeration design when email provider fails. |
| **Fix** | Never let send failure change HTTP status for forgot/resend; decouple send from response (queue + always 200). |

---

## Findings — P1 (Fix Before / With Release Gate)

### P1-1. JWT sessions survive password reset

| Location | `reset_password.py:32-48`, `jwt_token_service.py` |
| Issue | No `token_version` / `jti` revocation; pre-reset access tokens valid until expiry (~30 min). |
| Fix | Bump credential epoch on reset; embed in JWT; reject in `get_current_user`. |

### P1-2. Wholesale registration: no password confirmation

| Location | `wholesale-register-form.tsx:159-174`, `registerWholesaleAction` |
| Issue | Retail has `password_confirm` + server check; wholesale does not. |
| Fix | Mirror retail: confirm field + `Пароли не совпадают.` validation. |

### P1-3. Reset password: no password confirmation

| Location | `reset-password-form.tsx`, `resetPasswordAction` |
| Fix | Add confirm field + server-side match check. |

### P1-4. Forgot-password silent no-op for unverified users

| Location | `forgot_password.py:33-35` |
| Issue | Unverified account → 200 success message, no email. User should use resend-verification but UI does not guide. |
| Fix | Route unverified users to verification resend (same use case) or distinct non-enumerating UX copy on login 403. |

### P1-5. Verify-email page collapses all errors

| Location | `verify-email/page.tsx:24-31` |
| Issue | 400/429/5xx/network all show “invalid/expired link”; no resend CTA. |
| Fix | Branch on status; add resend link; try/catch network errors. |

### P1-6. Login 403 resend re-asks for email

| Location | `login-form.tsx:94-108` |
| Fix | Pre-fill email from login form into resend block. |

### P1-7. Auth forms touch targets below login standard

| Location | `register-form.tsx`, `forgot-password-form.tsx`, etc. use `h-9`; login uses `min-h-11` |
| Fix | Shared auth input/button classes with `min-h-11` (Wave 6 tail). |

### P1-8. Concurrent duplicate register → possible 500

| Location | `register_user.py:31-33` — check-then-insert without `IntegrityError` → 409 mapping |
| Fix | Catch DB unique violation → 409. |

### P1-9. Token consumption not atomic

| Location | `verify_email.py`, `reset_password.py`, `auth_token_repository.py` |
| Issue | TOCTOU: concurrent requests with same token can both succeed. |
| Fix | Conditional `UPDATE … WHERE used_at IS NULL`. |

### P1-10. Test gap: `/resend-verification` has zero pytest coverage

| Fix | Add P0 tests per qa-engineer recommendations below. |

### P1-11. Zero E2E customer auth flows

| Fix | New `auth-smoke.spec.ts`: register page, verify-email, forgot/reset pages. |

---

## Findings — P2 (Hardening / Polish)

| ID | Area | Finding |
|----|------|---------|
| P2-1 | Security | Register 409 / INN 409 reveals account existence (tradeoff vs UX) |
| P2-2 | Security | Timing side channel on forgot/resend (fast no-op vs slow send) |
| P2-3 | Security | In-memory rate limiter ineffective with multi-worker/replicas |
| P2-4 | Security | `TRUSTED_PROXY_HOPS=0` default breaks per-IP limits behind Caddy |
| P2-5 | Security | No per-account login lockout (only per-IP 5/min) |
| P2-6 | Security | Login 403 vs 401 reveals valid password for unverified account |
| P2-7 | UX | Dev-only copy on check-email shown in production |
| P2-8 | UX | `showResend` tied to fragile string match on error message |
| P2-9 | UX | `email_from` config unused; links depend on `storefront_url` |
| P2-10 | UX | Wholesale page layout inconsistent (`PageContainer` missing) |
| P2-11 | Ops | Console adapter logs full token bodies at INFO |

---

## Positives (Keep)

- Constant-time bcrypt verify with dummy hash (`login_user.py`, `bcrypt_hasher.py`)
- Generic 200 responses on forgot-password / resend-verification
- Tokens hashed at rest; single-use; expiry; revoke on reissue
- Rate limits wired for all auth POST endpoints
- RU error messages in server actions
- Retail register: password confirm + validation
- Login: unverified → 403 with resend path
- Reset success banner via `?reset=success`
- 20 pytest auth tests covering happy paths + validation + login rate limit

---

## Test Coverage Matrix

| Area | pytest happy | pytest negative | E2E |
|------|-------------|-----------------|-----|
| Retail register | ✅ | partial (dup, 422) | ❌ |
| Wholesale register | ✅ | partial | ❌ |
| Verify email | ✅ | ❌ invalid/reuse/expiry | ❌ |
| Resend verification | ❌ | ❌ | ❌ |
| Forgot password | ✅ (verified user) | ❌ unverified/unknown | ❌ |
| Reset password | ✅ | ❌ invalid/reuse/422 | ❌ |

### Minimal pytest additions (recommended)

```text
test_verify_email_invalid_token_returns_400
test_verify_email_token_cannot_be_reused
test_resend_verification_sends_email_for_unverified_user
test_forgot_password_unverified_user_sends_no_email
test_forgot_password_unknown_email_returns_200_no_email
test_reset_password_invalid_token_returns_400
test_reset_password_short_password_returns_422
```

### Minimal E2E additions

New `apps/web/e2e/auth-smoke.spec.ts` — page smokes + API-assisted verify/forgot/reset token flows (pattern: `page.request` + token from test API, no real SMTP).

---

## Recommended Action Plan

### Wave A — Email go-live (release gate, ~1–2 days)

1. Implement `SmtpEmailService` (aiosmtplib or stdlib `smtplib` in thread pool)
2. Production validator: reject `email_provider=console`; require `storefront_url` HTTPS + `email_from`
3. Fix register orchestration (single TX, email after commit / outbox)
4. Fix email-before-commit ordering in send/forgot use cases
5. Ensure forgot/resend always return 200 regardless of send outcome

### Wave B — Security hardening (~1 day)

1. JWT invalidation on password reset (`token_version` column + claim check)
2. Atomic token consumption
3. `IntegrityError` → 409 on register
4. Expand pytest (7 tests above)

### Wave C — Frontend UX (~0.5 day)

1. Wholesale + reset password confirm fields
2. Verify-email error branching + resend CTA
3. Pre-fill resend email on login 403
4. Remove dev copy from check-email; unify `min-h-11` on auth forms
5. E2E `auth-smoke.spec.ts`

---

## File Reference

| Layer | Key paths |
|-------|-----------|
| Router | `apps/api/app/features/auth/presentation/router.py` |
| Use cases | `apps/api/app/features/auth/application/use_cases/*.py` |
| Tokens | `auth_token_utils.py`, `auth_token_repository.py` |
| Email | `infrastructure/email/console_email_service.py`, `smtp_email_service.py` |
| Config | `apps/api/app/core/config.py` |
| Rate limits | `apps/api/app/core/middleware.py` |
| Frontend actions | `apps/web/src/app/actions/auth.ts` |
| Forms/pages | `apps/web/src/components/auth/*.tsx`, `apps/web/src/app/{register,verify-email,forgot-password,reset-password}/` |
| Tests | `apps/api/tests/test_auth.py` |

---

## Related Project Tasks

- `TASKS.md`: Feature “Email Verification & Password Reset” — follow-up SMTP production delivery
- `TASKS.md`: Wave 1 — `1.2 SMTP production delivery`
- `CURRENT_CONTEXT.md`: blocker “SMTP”
- `docs/reviews/PROJECT-ACTION-PLAN-2026-07-29.md` §1.2

---

## Review Agents

| Agent | Focus |
|-------|-------|
| security-auditor | Enumeration, tokens, rate limits, JWT reset, SMTP oracle |
| backend-engineer | Transactions, use cases, config, OpenAPI |
| frontend-engineer | Forms parity, touch targets, RU UX |
| silent-failure-hunter | Swallowed errors, prod console provider, partial register |
| qa-engineer | pytest/E2E gaps |

**Quality gate:** ⚠️ PASSED WITH NOTES — review deliverable complete; remediation tracked as separate features (Wave A–C above).
