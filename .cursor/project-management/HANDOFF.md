# Handoff

## Current Agent

Implementation Agent (Wave 0)

## Completed Work

**Wave 0 — code/CI items (2026-07-23):**

1. **0.6 CI deploy gate** — `deploy.yml` triggers only after successful CI on push to master (`workflow_run`); `workflow_dispatch` kept for emergency; `concurrency` group added.
2. **0.7 Customer auth rate limits** — `/auth/login` (5/min), register (3/min), forgot-password, resend-verification, reset-password, verify-email.
3. **0.8 Security fixes** — media upload 500 no longer leaks internal paths; removed dead `SyncProtectedFieldError` from `admin_ports.py`.
4. **deploy.sh** — TRUSTED_PROXY_HOPS warning, MEDIA https validation, media volume check, post-deploy curl smoke, Wave 0 ops checklist output.
5. **Tests** — `test_auth_login_rate_limit_returns_429`, `test_admin_upload_media_does_not_leak_internal_error` (2/2 green).

## Files Changed

| Area | Paths |
|------|-------|
| CI/CD | `.github/workflows/deploy.yml` |
| Backend | `apps/api/app/core/middleware.py`, `admin/presentation/media_router.py`, `catalog/domain/admin_ports.py` |
| DevOps | `scripts/deploy.sh` |
| Tests | `tests/test_auth.py`, `tests/test_admin_catalog.py` |

## Known Issues

- Wave 0 ops items 0.1–0.5 require prod server access (deploy, MS stock pull, gallery re-upload)
- Auto-deploy only fires after green CI push to `master` on repo `Edifier01/enterprise-ecommerce`

## Next Recommended Action

1. **Commit + push to master** → CI green → auto-deploy (or `workflow_dispatch` Deploy)
2. On prod: run MS «Обновить остатки»; re-upload 404 galleries
3. Verify storefront PLP photos + admin MS product save
4. Then start **Wave 1** (YooKassa sprint planning)
