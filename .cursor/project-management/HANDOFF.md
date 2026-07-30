# Handoff

## Latest Session

Composer — email verification code + link flow (auth)

## Completed Work

**Email verification: код + ссылка (2026-07-30):**

1. Backend: `generate_verification_code()` — 6-значный код; два токена в `auth_tokens` (код + ссылка).
2. `POST /api/v1/auth/verify-email-code` — подтверждение по `{ email, code }`.
3. HTML/text шаблон письма — код крупно + кнопка-ссылка как fallback.
4. Rate limit: 5 req/min на verify-email-code.
5. Frontend: форма ввода кода на `/register/check-email`, `verifyEmailCodeAction`.
6. Login: сообщение «Email подтверждён» при `?verified=success`.
7. OpenAPI: `VerifyEmailCodeRequest` + endpoint.
8. Tests: 38/38 auth+email green; tsc clean.

**Password reset** — без изменений (уже было: «Забыли пароль?», `/forgot-password`, `/reset-password`, письма).

## Files Changed

| Path | Change |
|------|--------|
| `apps/api/app/features/auth/application/auth_token_utils.py` | `generate_verification_code()` |
| `apps/api/app/features/auth/application/use_cases/send_email_verification.py` | dual tokens (code + link) |
| `apps/api/app/features/auth/application/use_cases/verify_email_code.py` | New use case |
| `apps/api/app/features/auth/application/use_cases/verify_email.py` | revoke sibling tokens on success |
| `apps/api/app/features/auth/infrastructure/email/templates.py` | code + link in verification email |
| `apps/api/app/features/auth/presentation/schemas.py` | `VerifyEmailCodeRequest` |
| `apps/api/app/features/auth/presentation/router.py` | `POST /verify-email-code` |
| `apps/api/app/core/middleware.py` | rate limit for verify-email-code |
| `apps/api/tests/test_auth.py` | code verification tests |
| `apps/api/tests/test_email_templates.py` | updated template test |
| `openapi.yaml` | verify-email-code endpoint + schema |
| `apps/web/src/app/actions/auth.ts` | `verifyEmailCodeAction` |
| `apps/web/src/components/auth/check-email-card.tsx` | code input form |
| `apps/web/src/components/auth/login-form.tsx` | verified success message |

## Test Run Results

- `pytest tests/test_auth.py tests/test_email_templates.py tests/test_smtp_email_service.py tests/test_production_config.py`: ✅ 38/38
- `tsc --noEmit` (apps/web): ✅ clean

## Known Issues

- Code not deployed to prod yet.
- SMTP password rotation reminder from prior session still applies.
- DNS SPF/DKIM not verified in-session.
- Playwright auth E2E for code flow not added (backend coverage sufficient for MVP).

## Next Recommended Action

**Deploy + prod SMTP smoke:**

1. Set `.env.production` SMTP vars (see `docs/ops/PRODUCTION-EMAIL-SETUP.md`).
2. `bash scripts/deploy.sh`
3. Smoke: Register → enter code on check-email page → login
4. Smoke: Forgot password → reset via link → login

Configure SPF/DKIM in reg.ru DNS before go-live send volume.

---

## Previous Session

Composer — Wave 1.2: production auth email (SMTP + HTML templates)
