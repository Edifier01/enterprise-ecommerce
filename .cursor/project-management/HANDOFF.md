# Handoff

## Latest Session

Composer — Wave 0 proceed A: admin Phase B/C commit + push

## Completed Work

**Wave 0.1 prerequisite — admin Phase B/C on master (2026-07-29):**

1. Pre-deploy: `npx tsc --noEmit` green in `apps/web/`.
2. Committed 26 files: AdminPageHeader, AdminFormSection, AdminKpiCard, 2-col product edit, visibility bulk toolbar, gallery DnD, dashboard KPI migration, list page headers, show/bulk hide actions, E2E smokes.
3. Pushed `a51743b` to `origin/master` → triggers CI → auto-deploy via `.github/workflows/deploy.yml`.

## Files Changed

| Path | Change |
|------|--------|
| `apps/web/src/components/admin/admin-*` | Phase B/C primitives + dashboard/catalog polish |
| `apps/web/src/app/admin/(panel)/**` | Page headers, layout, catalog edit 2-col |
| `apps/web/src/app/actions/admin-moysklad.ts` | showProductAction, bulk hide/show |
| `apps/web/e2e/admin-*-smoke.spec.ts` | New E2E smokes |
| `.cursor/project-management/*` | PM state update |

## Test Run Results

- `npx tsc --noEmit` (apps/web): ✅ pass (pre-commit)

## Known Issues

- CI/deploy status not verified in-session (check GitHub Actions).
- Wave 0.2–0.5 still pending on prod server (MOYSKLAD_STORE_ID, media volume, env vars, gallery re-upload).
- 329 products still uncategorized — storefront empty after deploy.

## Next Recommended Action

1. Confirm CI green + deploy completed on GitHub Actions.
2. Prod smoke: `https://сухопут-кмв.рф/admin` — KPI cards on dashboard; 2-col product edit.
3. Wave 0.2: set `MOYSKLAD_STORE_ID` in `.env.production` → restart API → «Обновить остатки».
4. Wave 0.5: `TRUSTED_PROXY_HOPS=1`, `MEDIA_PUBLIC_BASE_URL=https://сухопут-кмв.рф/media`.

---

## Latest Session

Senior Architect (Sonnet 4.6) — Full project review + agent action document

## Completed Work

**Full project review + agent action document (2026-07-29):**

1. Read all PM state files, COMPREHENSIVE-AUDIT-2026-07-23.md, all admin screenshots (prod), all modified source files.
2. Produced interactive canvas at `project-review-2026-07-29.canvas.tsx` (health metrics, admin/storefront/arch findings tables, Wave 0–4 roadmap).
3. Produced `docs/reviews/PROJECT-ACTION-PLAN-2026-07-29.md` — the primary agent action document with:
   - Health metrics table (Functional 92% / Business 60%)
   - Admin panel status table (14 UX waves, which deployed, which pending)
   - Storefront status table
   - Wave 0 (deploy ops, 0–3 days): 5 concrete action items with commands
   - Wave 1 (release gate, 2–4 weeks): YooKassa integration with full arch notes, SMTP, content ops
   - Wave 2 (reliability, 3–6 weeks): in_stock drift, boundary leaks, JWT revocation, backup runbooks
   - Wave 3 (growth, 6–10 weeks): SEO, CSP, error pages, Vitest, openapi-typescript, photography
   - Wave 4 (scale, backlog): Celery/ARQ, Redis, observability
   - Agent rules (before/during/after task)
4. Updated TASKS.md with Epic: Project Action Plan 2026-07-29 and Wave 0/1 tracking items.

## Files Changed

| Path | Change |
|------|--------|
| `docs/reviews/PROJECT-ACTION-PLAN-2026-07-29.md` | New — primary agent action document |
| `.cursor/project-management/TASKS.md` | Added Epic: Project Action Plan 2026-07-29 |
| `.cursor/project-management/HANDOFF.md` | This update |

## Known Issues

- No code was changed — this was a read-only audit + documentation session.
- All Wave 0–4 items are pending execution.
- 329 products have no categories → storefront is empty.
- MS stock shows 0 on prod (STORE_ID not verified / sync not run).

## Next Recommended Action

**Start Wave 0 immediately:**

1. Read `docs/reviews/PROJECT-ACTION-PLAN-2026-07-29.md` — Wave 0 section.
2. Run `./scripts/deploy.sh` on the production server — all code fixes from 22–24 July are in master.
3. Verify `MOYSKLAD_STORE_ID` (UUID from MoySklad URL) → set in `.env.production` → restart API → run «Обновить остатки» in admin.
4. Verify `media_uploads` Docker volume → re-upload 404 gallery photos.
5. Set `TRUSTED_PROXY_HOPS=1` and `MEDIA_PUBLIC_BASE_URL=https://сухопут-кмв.рф/media`.

**Then start Wave 1.1 (YooKassa)** — the main business blocker. Full arch notes in ACTION-PLAN doc section 1.1.

---

## Latest Session

GPT-5.5 (AI bootstrap package documentation)

## Completed Work

**Universal AI agent system bootstrap package (2026-07-29):**

1. Created `docs/ai-agent-system-bootstrap/` as a standalone multi-document package for new projects.
2. Package instructs a bootstrap agent to fully inspect a new project's `skills` folder, select only relevant skills, and create project-specific agents rather than copying e-commerce roles.
3. Captured the required `/start-feature` flow: context load, Feature Plan with agents/models/rounds/risks, explicit `proceed` gate, specialist execution, verifier, PM-state update.
4. Added project planning/todo coordination, file ownership rules, model routing, artifact templates, and validation checklist for generated AI systems.

## Files Changed

| Path | Change |
|------|--------|
| `docs/ai-agent-system-bootstrap/README.md` | New package entry point |
| `docs/ai-agent-system-bootstrap/BOOTSTRAP-PROMPT.md` | New prompt for the first bootstrap agent |
| `docs/ai-agent-system-bootstrap/AGENT-SYSTEM-SPEC.md` | New target AI system specification |
| `docs/ai-agent-system-bootstrap/PROJECT-PLANNING-AND-COORDINATION.md` | New whole-project plan, todo, file ownership, and handoff rules |
| `docs/ai-agent-system-bootstrap/START-FEATURE-WORKFLOW.md` | New portable `/start-feature` workflow |
| `docs/ai-agent-system-bootstrap/MODEL-ROUTING.md` | New portable model routing policy |
| `docs/ai-agent-system-bootstrap/TEMPLATES.md` | New templates for agents, skills, workflow, PM files |
| `docs/ai-agent-system-bootstrap/VALIDATION-CHECKLIST.md` | New acceptance checklist |
| `docs/UNIVERSAL-AI-AGENT-SYSTEM-BOOTSTRAP-PROMPT.md` | Compatibility pointer to the new package |
| `.cursor/project-management/CURRENT_CONTEXT.md` | Updated current context |
| `.cursor/project-management/PROJECT_STATUS.md` | Added recently completed package |
| `.cursor/project-management/TASKS.md` | Added completed improvement item |
| `.cursor/project-management/HANDOFF.md` | Added latest session handoff |

## Test Run Results

- Not run — documentation-only change.

## Known Issues

- Existing unrelated uncommitted application/admin/storefront changes remain untouched.
- No `DECISIONS.md` update required; this is a documentation package, not a new application architecture decision.

## Next Recommended Action

Use `docs/ai-agent-system-bootstrap/README.md` and `BOOTSTRAP-PROMPT.md` when starting a new project. Attach the whole folder plus the new project's application logic and `skills` folder.

---

## Latest Session

GPT-5.5 (AI bootstrap documentation)

## Completed Work

**Universal AI agent system bootstrap prompt (2026-07-28):**

1. Created a reusable instruction document for starting any software project from scratch with a project-specific AI agent system.
2. Document guides a future agent to read product logic, inspect available `rules`, `skills`, `agents`, `workflows`, and assemble only the needed orchestrator, verifier, specialists, lifecycle workflow, and PM state.
3. Included product brief template, bootstrap prompt, model routing policy, minimum viable agent set, domain agent examples, and first feature invocation.

## Files Changed

| Path | Change |
|------|--------|
| `docs/UNIVERSAL-AI-AGENT-SYSTEM-BOOTSTRAP-PROMPT.md` | New reusable bootstrap prompt |
| `.cursor/project-management/CURRENT_CONTEXT.md` | Updated current context |
| `.cursor/project-management/PROJECT_STATUS.md` | Added recently completed documentation item |
| `.cursor/project-management/TASKS.md` | Added completed improvement item |
| `.cursor/project-management/HANDOFF.md` | Added latest session handoff |

## Test Run Results

- Not run — documentation-only change.

## Known Issues

- Existing unrelated uncommitted application/admin/storefront changes remain untouched.
- No new ADR required; this is a reusable prompt/documentation artifact, not an architectural change to the application.

## Next Recommended Action

Use `docs/UNIVERSAL-AI-AGENT-SYSTEM-BOOTSTRAP-PROMPT.md` as the attachment when starting a new project. Paste the new project's application logic into the "Application Logic" placeholder.

---

## Current Agent

Composer (Storefront PDP/PLP image + specs cleanup)

## Completed Work

**Storefront PDP/PLP — фото и скрытие характеристик (2026-07-24):**

1. PDP gallery main image: `object-cover` → `object-contain` (no corner crop)
2. PLP `ProductCard`: switched to `ProductThumbnail` with `object-contain` + ERP/placeholder onError fallback
3. `ProductThumbnail`: ERP proxy fallback when `productSlug` is set (not only when `erpImageUrl` passed)
4. PDP: removed «Характеристики» block entirely (including SKU/Артикул)
5. `product-specs-table`: removed «Артикул» row (component retained for possible reuse)

## Files Changed

| Path | Change |
|------|--------|
| `apps/web/src/components/store/catalog/product-gallery.tsx` | Main image `object-contain` |
| `apps/web/src/components/store/catalog/product-card.tsx` | `ProductThumbnail` + `object-contain` |
| `apps/web/src/components/store/catalog/product-thumbnail.tsx` | ERP fallback via slug |
| `apps/web/src/components/store/catalog/product-detail.tsx` | Remove specs block |
| `apps/web/src/components/store/catalog/product-specs-table.tsx` | Remove Артикул row |

## Test Run Results

- **`npx tsc --noEmit` (apps/web):** attempted; no errors reported in session
- **Prod browser smoke:** NOT RUN — changes not deployed yet

## Known Issues

- Changes not committed / not on prod
- If PLP still shows placeholder after deploy, check `/media/` files on prod (404 gallery URLs need re-upload in admin)
- Do not mix commit with uncommitted admin redesign or stich parity work

## Next Recommended Action

1. `npx tsc --noEmit` in `apps/web` before commit
2. Commit storefront photo/specs fix (separate from admin redesign)
3. Deploy + prod smoke: PDP photo not cropped, PLP cards show images, no «Характеристики»/«Артикул» on PDP
4. Verify `https://сухопут-кмв.рф/products/krossovki-elkland-178e` after deploy

## Session Note

- Feature Plan: STANDARD, ADR not required
- User confirmed «proceed» after `/start-feature` plan
