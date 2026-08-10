# Handoff

## Latest Session

Composer 2.5 — Fix mobile admin-orders E2E (2026-08-10)

## Completed Work

CI almost green after `c2290d4`; remaining failure:
- `[mobile-chrome] admin-orders-smoke` — `getByText('Доставка и клиент')` not found

**Cause:** Chromium often skipped detail assert (no ORD- yet); mobile ran later after checkout created orders. Assertion was brittle for mobile nav + case.

**Fix:** Wait for detail URL + h1; assert delivery heading case-insensitively; target `main a[href*="/admin/orders/ORD-"]`; drop `uppercase` on that section label.

**Next:** confirm CI green → merge to master → deploy + prod SMTP.

---

## Previous Session

Composer 2.5 — CI green: OpenAPI + auth/checkout E2E (2026-08-10)

## Completed Work

Fixed CI failures on `feat/wave-a-l3-guest-email-adr016`:

1. **OpenAPI** — regenerated `openapi.yaml` with `CreateCheckoutSessionRequest.guest_email`
2. **Auth headings** — `CardTitle` now renders `<h3>` so Playwright `getByRole('heading')` works
3. **Resend email strict mode** — `id="resend-email"` + aria-label; auth-smoke asserts `#resend-email`
4. **Checkout stub** — `fillCheckoutShipping` fills «Email для подтверждения заказа» when present

**Local E2E:** not run (Docker Desktop unavailable). Rely on CI after push.

**Files changed:** `openapi.yaml`, `apps/web/src/components/ui/card.tsx`, `apps/web/src/components/auth/login-form.tsx`, `apps/web/e2e/test-helpers.ts`, `apps/web/e2e/auth-smoke.spec.ts`

**Next:** confirm CI green → merge to master → deploy + prod SMTP.

---

## Previous Session

Composer 2.5 — Register prod diagnosis + form UX confirmation (2026-08-10)

## Completed Work

**Production register failure root cause (verified on https://сухопут-кмв.рф):**
- `POST /api/v1/auth/register` returns **500** on master even with valid `first_name`/`last_name`/`email`/`password`
- User **is created** (second attempt → 409 Email already registered) — failure happens after user insert, during verification email send (SMTP error on master; send is not wrapped in try/except)
- Fix already in `daf16fe`: commit token before send + catch email failures → registration returns 201

**Register form UX (already in `daf16fe`, not yet on prod):**
- Removed `Имя` / `Фамилия` fields
- Added `Повторите пароль` with server-side match validation in `registerAction`

**Next:** merge `feat/wave-a-l3-guest-email-adr016` → `master`, deploy, configure prod SMTP

---

## Previous Session

Composer 2.5 — Commit auth Waves A–C + Mobile Wave 5 (2026-08-10)

## Completed Work

**Git commit `daf16fe` on `feat/wave-a-l3-guest-email-adr016`:**
- Auth Waves A–C (API + web), migration 023, auth review doc, Mobile Wave 5
- Pushed to `origin/feat/wave-a-l3-guest-email-adr016`
- **Deploy to prod pending** — merge to `master` blocked by local approval UI; user must merge/push manually

**Deploy checklist after merge:**
1. CI green → Deploy workflow runs `scripts/deploy.sh` (includes `alembic upgrade head`)
2. Set prod `.env.production`: `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `STOREFRONT_URL` (HTTPS) — API validator rejects console in production
3. Smoke: register → verify email, forgot → reset password, login after reset (old JWT invalid)

---

## Previous Session

Composer 2.5 — Auth Wave C UX + E2E (2026-08-10)

## Completed Work

**Auth Wave C:**
1. Shared `authInputClassName` / `authLinkClassName` — min-h-11 on all auth forms
2. Wholesale + reset password confirm (client + server actions)
3. Login: `needsEmailVerification` flag + prefilled resend email; 429 messages
4. verify-email: branch invalid vs unavailable; login CTA instead of re-register only
5. check-email: dev hint only in development
6. Wholesale page → `PageContainer`
7. E2E `auth-smoke.spec.ts` — 9 customer auth smokes

## Files Changed

| Path | Change |
|------|--------|
| `apps/web/src/lib/auth/form-styles.ts` | Shared touch-target classes |
| `apps/web/src/app/actions/auth.ts` | confirm fields, resend flags, 429 |
| `apps/web/src/components/auth/*.tsx` | UX parity + min-h-11 |
| `apps/web/src/app/verify-email/page.tsx` | Error branching |
| `apps/web/src/app/register/wholesale/page.tsx` | PageContainer |
| `apps/web/e2e/auth-smoke.spec.ts` | New E2E smokes |

## Next Recommended Action

1. **Merge `feat/wave-a-l3-guest-email-adr016` → `master` and push** (triggers CI + Deploy)
2. Configure prod SMTP in `.env.production` on VPS before or immediately after deploy
3. Run `npx playwright test e2e/auth-smoke.spec.ts` against prod/staging

---

## Previous Session

Composer 2.5 — Auth Wave B JWT revoke + atomic tokens (2026-08-10)

## Completed Work

**Auth Wave B:**
1. Migration `023_user_token_version` — `users.token_version`
2. JWT claim `tv`; login embeds version; `/me` + checkout reject stale tokens
3. `update_password` bumps `token_version` → old sessions invalid after reset
4. `consume_valid_by_hash` — atomic single-use verify/reset tokens
5. Tests: revoke after reset, token reuse 400, policy unit tests — **27 passed**

## Files Changed

| Path | Change |
|------|--------|
| `alembic/versions/023_user_token_version.py` | Migration |
| `auth/domain/entities.py`, `token_claims.py`, `ports.py` | token_version + consume |
| `auth/application/access_token_policy.py` | Match helper |
| `auth/infrastructure/security/jwt_token_service.py` | `tv` claim |
| `auth/infrastructure/persistence/models.py`, `repository.py` | Column + bump on reset |
| `auth/infrastructure/persistence/auth_token_repository.py` | Atomic consume |
| `auth/use_cases/verify_email.py`, `reset_password.py` | Use consume |
| `auth/presentation/dependencies.py`, `checkout/.../dependencies.py` | Version check |
| `tests/test_auth.py`, `test_access_token_policy.py` | New tests |

## Next Recommended Action

1. Deploy migration `023` on staging/prod
2. Wave C: wholesale/reset password confirm, verify-email UX, auth E2E
3. Prod SMTP creds if not yet set

---

## Previous Session

Composer 2.5 — Auth Wave A email go-live (2026-08-10)

## Completed Work

**Auth Wave A:**
1. `SmtpEmailService` — real SMTP via stdlib + `asyncio.to_thread` (STARTTLS / SSL)
2. Production validator: `email_provider=smtp`, `smtp_host`, `email_from`, `storefront_url` HTTPS
3. Register use cases no longer commit early; verification token + user commit together, then send
4. `SendEmailVerificationUseCase` / `ForgotPasswordUseCase`: commit before send; log + swallow send errors
5. Console email: no token in INFO logs (body_len only)
6. Tests: +2 auth (email fail still 201/200), +3 production config; **33 passed**

## Files Changed

| Path | Change |
|------|--------|
| `apps/api/app/features/auth/infrastructure/email/smtp_email_service.py` | Real SMTP |
| `apps/api/app/features/auth/application/use_cases/register_user.py` | Defer commit |
| `apps/api/app/features/auth/application/use_cases/register_wholesaler.py` | Defer commit |
| `apps/api/app/features/auth/application/use_cases/send_email_verification.py` | Commit-before-send |
| `apps/api/app/features/auth/application/use_cases/forgot_password.py` | Commit-before-send |
| `apps/api/app/core/config.py` | Prod email validation |
| `apps/api/tests/test_auth.py`, `test_production_config.py` | New tests |
| `.env.example`, `.env.production.example` | SMTP docs |

## Next Recommended Action

1. Set prod env: `EMAIL_PROVIDER=smtp`, `SMTP_*`, `STOREFRONT_URL=https://…`
2. Wave B: JWT revoke on reset, atomic tokens
3. Wave C: wholesale/reset password confirm, auth E2E

---

## Previous Session

Composer 2.5 — Auth flows review (2026-08-10)

## Completed Work

**Auth flows multi-agent review:**
1. Parallel review: security-auditor, backend-engineer, frontend-engineer, silent-failure-hunter, qa-engineer
2. Synthesis: `docs/reviews/AUTH-FLOWS-REVIEW-2026-08-10.md`
3. Verifier ⚠️ **PASSED WITH NOTES**

**Key findings:** P0 SMTP/console prod gap, register split-TX, email-before-commit, forgot 500 oracle; P1 JWT on reset, password confirm gaps, zero resend pytest/E2E.

## Files Changed

| Path | Change |
|------|--------|
| `docs/reviews/AUTH-FLOWS-REVIEW-2026-08-10.md` | New — full auth review synthesis |

## Known Issues / residual

- Findings documented only — no code fixes this session
- SMTP production delivery remains release gate

## Next Recommended Action

1. Wave A: implement SMTP + prod validator + register orchestration (P0)
2. Or P1 UX: wholesale/reset password confirm, verify-email resend CTA
3. Add 7 pytest + `auth-smoke.spec.ts` per review

---

## Previous Session

Composer — Opus 4.8 → Opus 5 migration in AI model routing (2026-08-10)

## Completed Work

**Opus 5 migration (AI-002, cost policy unchanged):**
1. Reserved Opus agents now use `claude-opus-5-thinking-high`: `enterprise-architect`, `checkout-specialist`, `security-auditor`
2. `verifier` escalation path → Opus 5
3. Updated `08-model-routing.mdc`, `docs/MODEL-ROUTING.md`, `model-routing` skill, `subagent-orchestrator`, GUIDE, SKILL-MANIFEST, agent template
4. Fallback: Opus 5 → Opus 4.8 → GPT-5.5

## Files Changed

| Path | Change |
|------|--------|
| `.cursor/agents/enterprise-architect.md` | `claude-opus-5-thinking-high` |
| `.cursor/agents/checkout-specialist.md` | `claude-opus-5-thinking-high` |
| `.cursor/agents/security-auditor.md` | `claude-opus-5-thinking-high` |
| `.cursor/agents/verifier.md` | escalation slug → Opus 5 |
| `.cursor/rules/core/08-model-routing.mdc` | primary + fallback chain |
| `.cursor/skills/model-routing/SKILL.md` | Opus 5 + fallback |
| `.cursor/skills/subagent-orchestrator/SKILL.md` | Opus 5 slug |
| `docs/MODEL-ROUTING.md` | slug table + labels |
| `docs/GUIDE.md`, `docs/SKILL-MANIFEST.md`, `templates/07-agent-template.md` | slug references |

## Known Issues / residual

- Enable **Opus 5** in Cursor Settings → Models if not already visible
- Same per-token price as 4.8; adaptive thinking may increase output tokens per session
- Prod mobile deploy + YooKassa gate unchanged from prior handoff

## Next Recommended Action

1. Cursor Settings → Models: confirm Opus 5 enabled
2. First real run: `checkout-specialist` on YooKassa prod-gate planning
3. Commit when ready (user must ask)
4. Prior handoff items still apply: deploy Wave 5 mobile, prod smoke, migrations 021–022

---

## Previous Session

Grok 4.5 — Mobile UX Wave 4 synthesis + Wave 5 P0/P1 implementation + verifier (2026-08-08)

---

## Previous Session

qa-engineer — Mobile UX Wave 4 Round 1 production audit (2026-08-08)

---

## Previous Session

frontend-engineer — Mobile UX Wave 4 Round 1 code audit (2026-08-08)
