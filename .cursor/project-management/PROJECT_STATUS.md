# Project Status

> Operational snapshot — "Where are we now?"
> Strategic phases remain in `PROJECT_ROADMAP.md`.

---

## Current Phase

**Phase 24 — Internet Store Design**

Sprint E (wholesale pricing) complete 2026-07-10.

---

## Current Objective

**Final YooKassa Payment Integration** — replace Stripe prototype with production provider before release gate.

---

## Current Sprint

**Final Project Gate — YooKassa** ⏳ **PLANNED**

---

## Progress

**AI Development Platform (Phases 0–23, 25):** ✅ 100% complete

**Overall roadmap:** ~99% (25/26 phases)

**Phase 24 (application):** ~92% functional / ~60% business release-ready (comprehensive audit 2026-07-23; YooKassa + ops gaps)

---

## Completed Work

- [x] Sprints 1–10 — core commerce
- [x] Post-sprint — search, orders UI, TTL sweep, dev payment stub
- [x] Sprint A–D — Admin foundation, catalog, inventory, orders
- [x] **Sprint E — Wholesale Pricing** (2026-07-10)

---

## Active Work

- [ ] Wave 0 ops: prod deploy pending fixes (push master → CI → deploy)
- [ ] Wave 0 ops: MS stock verify + gallery re-upload on prod
- [x] Wave 0 code: CI deploy gate, auth rate limits, media 500 fix, deploy.sh smoke
- [ ] Admin design system / loading states polish (UX roadmap step 2)
- [ ] Real product/category photography — BACKLOG
- [ ] SMTP email delivery (production)
- [ ] Final YooKassa payment integration

## Recently Completed

- [x] **Comprehensive audit synthesis** — 10 specialist agents, unified roadmap Waves 0–4 (`docs/reviews/COMPREHENSIVE-AUDIT-2026-07-23.md`) (2026-07-23)
- [x] **Storefront PLP photos** — list/search API gallery fallback + product-grid resolver, 5 pytest (2026-07-23)
- [x] **Storefront UX fixes** — cart badge, hide SKU, PDP image fallback (2026-07-23)
- [x] **Admin MS product save fix** — SyncProtectedFieldError import + omit currency in PATCH, 2 pytest (2026-07-23)
- [x] **MoySklad stock sync fix** — store_id normalization, variant report, skip-missing guard, 7 pytest (2026-07-23)
- [x] **Admin media upload fix** — relative `/media/` URLs, video rejection, gallery preview, 18 pytest (2026-07-22)

- [x] **Prod deploy Admin UX Waves 8–14** — GitHub Actions deploy #32; migrations through 020; build hotfix `bulk-jobs-shared.ts` (2026-07-22)
- [x] **Admin UX Wave 14** — bulk background jobs for import queue assign/publish (2026-07-22)
- [x] **Admin UX Wave 13** — command palette Cmd+K + AdminErrorState rollout (2026-07-22)
- [x] **Admin UX Wave 12** — import queue + customers on AdminDataTable (2026-07-22)
- [x] **Admin UX Wave 11** — inventory overview API + dashboard low-stock card (2026-07-22)
- [x] **Admin UX Wave 10** — catalog overview API + catalog AdminDataTable (2026-07-22)
- [x] **Admin UX Wave 8 (P0 + quick wins)** — sidebar, hydration, filter chips, search, sticky save, confirm dialog, toast tones (2026-07-22)
- [x] **Admin UX browser audit + improvement plan** — production browser review and saved roadmap (`docs/reviews/ADMIN-PANEL-UX-IMPROVEMENT-PLAN-2026-07-22.md`) (2026-07-22)
- [x] **Admin MS stock visibility** — catalog list + variant detail from MoySklad inventory (2026-07-22)
- [x] **Review follow-ups** — security P1, CI alembic/OpenAPI, checkout E2E shipping, PM cleanup (2026-07-21)
- [x] **Full project review** — architecture, security, QA/CI, devops, backend, frontend (2026-07-21); pytest 213 green
- [x] **Admin P2 polish** — flaky test, viewer E2E, MFA 404 regression (2026-07-21)
- [x] **Admin P1 hardening** — page RBAC, login UX, OpenAPI sync (2026-07-21)
- [x] **Admin P0 security hardening** — lockout, IP allowlist, upload rate limit, `is_active` JWT (2026-07-21)
- [x] **Admin MFA removed** — password-only login, migration 018, ADR-014 (2026-07-21)
- [x] **Admin panel review** — P0/P1/P2 findings documented (2026-07-21)
- [x] **Local server media storage** — S3 removed; Docker volume + `/media` proxy (2026-07-21)
- [x] **Production S3/MFA configuration** — superseded by ADR-013 (2026-07-21)
- [x] **Dev DB migrations 014–017** — Docker Postgres + alembic at head + seed_dev (2026-07-21)
- [x] **Admin P3 hardening** — image URL validation, magic-byte uploads, MoySklad error sanitization (2026-07-21)
- [x] **Admin P2 hardening** — S3 presign size, React cache dedupe, MFA QR/disable/regenerate (2026-07-21)
- [x] **Admin P1 hardening** — MFA refresh UX, server-action permissions, permission-aware nav (2026-07-21)
- [x] **Admin P0 security hardening** — MFA state machine, `ADMIN_MFA_REQUIRED` enforcement, MFA verify rate limit, production JWT fail-hard (2026-07-21)
- [x] **Admin production hardening** — TOTP MFA, S3 presigned media, migration 017 (2026-07-20)
- [x] **Catalog navigation UX** — category column + contextual back links (2026-07-20)
- [x] **Catalog list RBAC** — write actions gated by `catalog:write` (2026-07-20)
- [x] **Bulk publish merchandising guard** — photo/gallery API + action validation (2026-07-20)
- [x] **Catalog landing UX fix** — duplicate import tile removed (2026-07-20)
- [x] **Admin Panel UX Wave 7** — multi-color gallery merchandising, bulk publish (2026-07-20)
- [x] **Admin Panel UX Wave 6** — bulk import assign, JWT middleware, login rate limit (2026-07-20)
- [x] **Admin Panel UX Wave 5** — export_pending orders, adminFetch errors, import checklist (2026-07-20)
- [x] **Admin Panel Review Wave 4** — read-only inventory, viewer fixes, order export, SKU search (2026-07-20)
- [x] **MS-only admin workflow** — block manual products, category delete fix, UX (2026-07-19)
- [x] **MoySklad Import Queue** — per-product category, visibility gate, stock threshold, category delete (2026-07-19)
- [x] **MoySklad Phase 6** — returns hook, full resync, OpenAPI, E2E smoke (2026-07-19)
- [x] **MoySklad Phase 5** — order export to MS on payment success (2026-07-19)
- [x] **MoySklad Phase 4** — admin display UI, gallery, SEO, integration page (2026-07-19)
- [x] **MoySklad Phase 3** — webhooks, cron stock sync, read-only MS client (2026-07-19)
- [x] **MoySklad Phase 2** — catalog import use case, CLI, price/stock parsing (2026-07-19)
- [x] **MoySklad Phase 1** — ADR-010, migration 014, ACL client, admin guards (2026-07-19)
- [x] **Admin Panel UX Wave 3** — gallery option_color tagging for PDP color sync (2026-07-19)
- [x] **Admin Panel UX Wave 2** — grouped nav, action center, MS inventory read-only, save+toast (2026-07-19)
- [x] **Mobile storefront Wave 1** — header, nav, cart sticky CTA, catalog toolbar (2026-07-19)
- [x] **Admin UX polish** — category-first catalog, RUB pricing, read-only wholesaler status (2026-07-16)
- [x] **E2E test stabilization** — 24/24 Playwright green; cart upsert race fix (2026-07-16)
- [x] **Homepage search UX** — placeholder «Название», promo cards removed (2026-07-16)
- [x] **Admin Panel Optimization Wave A–C** (2026-07-16)
- [x] **Production Catalog Optimization Wave 1–3** (2026-07-16)

---

## Blocked Work

None.

---

## Next Actions

1. Deploy media upload fix; verify prod gallery upload smoke
2. Confirm Docker volume `media_uploads` persists across deploys
3. Admin design system primitives (`AdminPageHeader`, `AdminLoadingSection`, …)
4. Back up Docker volume `media_uploads` periodically
5. SMTP production delivery
6. YooKassa provider integration (replace/refactor Stripe paths)

---

## Last Updated

2026-07-23 (Comprehensive audit synthesis)

---

## Last Agent

Orchestrator (10-agent audit + roadmap synthesis)
