# Handoff

## Current Agent

Implementation Agent

## Completed Work

**СУХОПУТ storefront UX + registration (2026-07-13):**

- TopBar: centered search field; «Связаться» and support email retained
- MainHeader: cart icon near profile; email removed from header; nav = Главная + Каталог only
- Branding: `siteConfig.name` → «СУХОПУТ»; logo in header; favicon via `src/app/icon.png`
- Retail registration: Фамилия, Имя, email, password; duplicate email → 409
- Wholesaler registration: `/register/wholesale` + `POST /api/v1/auth/register/wholesaler`
  - Fields: ФИО, ЭДО, ЭДО ID, phone, ИНН (12), ОГРНИП (15), legal address, email, password
  - Sets `is_wholesaler=true`; unique INN constraint
- Migration `011_user_profiles_wholesaler`: `users.first_name/last_name`, `wholesaler_profiles` table
- Tests: 119/119 pytest green; `tsc --noEmit` clean

## Files Changed

| Area | Key paths |
|------|-----------|
| Frontend layout | `top-bar.tsx`, `main-header.tsx`, `navigation.ts`, `site-config.ts` |
| Frontend auth | `register-form.tsx`, `wholesale-register-form.tsx`, `register/wholesale/page.tsx`, `actions/auth.ts` |
| Assets | `public/logo.png`, `src/app/icon.png` |
| Backend | `register_user.py`, `register_wholesaler.py`, `router.py`, `schemas.py`, `models.py`, `repository.py` |
| DB | `011_user_profiles_wholesaler.py` |
| OpenAPI | `openapi.yaml` |
| Tests | `test_auth.py`, `auth_payloads.py`, other test register payloads |
| E2E | `e2e/homepage.spec.ts` |

## Known Issues

- Wholesaler self-registration bypasses admin approval (by user request); no moderation queue yet
- Admin customers UI does not yet display wholesaler profile business fields
- Run `alembic upgrade head` on PostgreSQL before testing registration in dev

## Next Recommended Action

**Final YooKassa Payment Integration** — see `TASKS.md` Final Project Gate section.

Optional follow-up: show wholesaler profile fields in `/admin/customers` detail view.

## How to Run

```bash
docker compose up -d postgres
cd apps/api && alembic upgrade head && uvicorn app.main:app --reload --port 8000
cd apps/web && npm run dev
```
