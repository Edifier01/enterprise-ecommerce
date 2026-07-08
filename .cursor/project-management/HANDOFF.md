# Handoff

## Current Agent

Implementation Agent (Sprint 8 Product Variants & Pricing — tests + cleanup + verify + PM sync)

## Previous Agent

Implementation Agent (Sprint 7 Category domain — verified complete + PM sync)

## Completed Work

**Sprint 8 — Product Variants & Pricing Display (finalized this session):**

Discovered — as with Sprint 7 — that the Sprint 8 implementation and `ADR-002`
were already present from a prior session but were untested and never PM-synced.
This session verified all layers, added the missing test coverage, confirmed the
frontend mock cleanup, ran the full verification, and synced PM state.

- Verified backend already complete: `ProductVariant` entity, `compare_at_price_cents`
  invariant, `category_id` FK, migration `005`, repository (variant `selectinload` +
  `category` slug filter), use cases, router, schemas.
- Verified `openapi.yaml`, `seed_dev.py`, and frontend PDP (`ProductPurchasePanel`
  variant selector + sale price + discount badge) already in sync.
- Verified `/catalog` and `/catalog/[slug]` already filter by the real primary
  category via `listProducts(..., categorySlug)` (ADR-002), not the old mock.
- **Added** `apps/api/tests/test_variants.py` — 11 tests: variant ordering & shape,
  list omits variants, sale vs. no-sale compare-at, category filter (match / other /
  unknown / none), and the `compare_at_price_cents > price_cents` domain invariant.
- Confirmed dead frontend mock (`assignCategorySlug`, `filterProductsByCategory`,
  `countProductsInCategory`) already removed from `categories.ts`; no code references
  remain (grep-verified — only docs/HANDOFF mention the old names historically).
- Indexed `ADR-002` in `DECISIONS.md`.

## Files Changed

| File | Change |
|------|--------|
| `apps/api/tests/test_variants.py` | Created — 11 variant/pricing/category-filter tests |
| `apps/web/src/lib/store/categories.ts` | Dead mock helpers removed; retained as offline fallback (already applied) |
| `.cursor/project-management/DECISIONS.md` | ADR-002 indexed |
| `.cursor/project-management/TASKS.md` | Sprint 8 section marked complete |
| `.cursor/project-management/PROJECT_STATUS.md` | Sprint 8 complete; progress ~90%; next = Stripe |
| `.cursor/project-management/CURRENT_CONTEXT.md` | Current feature = Sprint 8 complete |

## Known Issues

- Product↔Category is a single **primary** FK; full many-to-many is deferred per
  ADR-002 until secondary cross-navigation is required.
- `ICategoryRepository.get_by_slug()` still not exposed as `GET /api/v1/categories/{slug}`;
  frontend resolves slug from the full category list.
- Child-category product counts on category pages are shown as `0` (no per-category
  count endpoint yet).
- Cart `?add=` param shows a notice only — no persistent cart until checkout feature.
- Search is a UI placeholder — no backend search API yet.
- E2E tests require a running Next.js dev server on `:3000`; CI skips Playwright when
  API unavailable.
- Local test runs require `DATABASE_URL=sqlite+aiosqlite:///:memory:` (no local
  Postgres driver). NOTE: the Windows shell sandbox (`workspace_readwrite`) is
  unsupported here — run commands with sandbox disabled.

## Verification Results

- Backend: **35/35 pytest green** (24 prior + 11 new variant/pricing tests)
- TypeScript: `tsc --noEmit` **0 errors**

## Next Recommended Action

**Sprint 9 — Stripe Checkout Integration** (Checkout & Payments epic, currently BACKLOG):

1. Cart session management (guest session cookie + line snapshots)
2. Stripe PaymentIntent creation with idempotency (see `ecommerce/03-payments`,
   `security/02-pci`)
3. Webhook handler with signature verification + event dedup
4. Order confirmation flow
5. Requires an ADR (touches payments/PCI → COMPLEX per `start-feature` classification)
