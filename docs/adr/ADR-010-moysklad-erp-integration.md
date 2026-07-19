# ADR-010: MoySklad as ERP Source of Truth

**Status:** Accepted  
**Date:** 2026-07-19

## Context

The storefront catalog and inventory are currently managed entirely in the local
PostgreSQL database via the admin panel. Business operations (SKU, prices, stock,
product modifications — size/color) are maintained in **МойСклад** (MoySklad).

Requirements:

| Rule | Decision |
|------|----------|
| Products, stock, prices, sizes, colors | Master in **MoySklad** |
| Display content (name, photos, description, SEO, category on site) | Master on **site** (admin) |
| Admin cannot edit MS-owned fields | Enforced at API + UI |
| Wholesale + retail prices | Both synced from MS price types (ADR-008) |
| Stock warehouse | **Single warehouse** configured via env (`MOYSKLAD_STORE_ID`) |
| New MS products | Import as `draft` until admin adds photos and publishes |
| Orders from site | Export to MS as customer orders (Phase 3) |

Existing architecture constraints:

- Catalog and Inventory are separate bounded contexts (ADR-002, ADR-005).
- Checkout reservations are local; MS does not know about them until order export.
- Admin panel is a separate security boundary (ADR-007).
- Integration adapters belong in infrastructure, not domain (`.cursor/rules/integrations/00-integrations.mdc`).

## Decision

### 1. Overlay pattern — two layers of product data

```
┌─────────────────────────────────────────────────────────┐
│  Display layer (site-owned, editable in admin)          │
│  name, slug, description, image_url, gallery, SEO,      │
│  category_id, status, compare_at_price_cents             │
├─────────────────────────────────────────────────────────┤
│  ERP snapshot (MoySklad-owned, sync-only)               │
│  erp_name, sku, price_cents, wholesale_price_cents,     │
│  attributes (size/color), quantity_on_hand, barcode,    │
│  weight, dimensions                                     │
└─────────────────────────────────────────────────────────┘
```

- `products.name` remains the **display name** shown on the storefront.
- `products.erp_name` stores the MoySklad product name (read-only reference).
- `products.sync_source`: `manual` | `moysklad` — controls field editability.
- `products.moysklad_product_id` / `product_variants.moysklad_variant_id` — stable
  upsert keys.

**Conflict resolution:** sync never overwrites display fields. Sync always
overwrites ERP-owned fields.

### 2. New bounded context: `integrations/moysklad`

```
apps/api/app/features/integrations/moysklad/
├── domain/           # IMoySkladClient, ISyncRepository ports
├── application/      # ImportProducts, SyncStock, HandleWebhook, ExportOrder
├── infrastructure/   # HTTP client (JSON API 1.2), webhook verifier, mappers
└── presentation/     # webhook endpoint, admin integration status/trigger
```

**Anti-Corruption Layer (ACL):** MoySklad entities (`entity/product`, `entity/variant`,
`salePrices`, `storebalances`) are mapped to catalog/inventory domain objects only
inside `moysklad/infrastructure/`. Catalog domain never imports MoySklad types.

### 3. Field ownership matrix

| Field | Owner | Admin editable |
|-------|-------|----------------|
| `name` (display) | Site | Yes |
| `slug` | Site | Yes |
| `description` | Site | Yes |
| `image_url`, gallery | Site | Yes |
| `meta_title`, `meta_description` | Site | Yes |
| `category_id` | Site | Yes (manual mapping) |
| `status` | Site | Yes |
| `compare_at_price_cents` | Site | Yes (marketing) |
| `erp_name` | MoySklad | No |
| `sku` | MoySklad | No |
| `price_cents` | MoySklad | No |
| `wholesale_price_cents` | MoySklad | No |
| `attributes` (size/color) | MoySklad | No |
| `quantity_on_hand` | MoySklad | No |
| `barcode`, weight, dimensions | MoySklad | No (display read-only) |

Manual products (`sync_source = manual`) remain fully editable in admin and are
**excluded** from MoySklad sync.

### 4. Entity mapping

| MoySklad | Site |
|----------|------|
| `entity/product` | `Product` |
| `entity/variant` (modification) | `ProductVariant` |
| Modification characteristics | `attributes: { "size": "L", "color": "olive" }` |
| Price type «Розница» (env `MOYSKLAD_RETAIL_PRICE_TYPE`) | `price_cents` |
| Price type «Опт» (env `MOYSKLAD_WHOLESALE_PRICE_TYPE`) | `wholesale_price_cents` |
| `storebalances` for configured store | `inventory_items.quantity_on_hand` |
| `archived: true` | `status = archived` |
| `externalCode` / `code` | Secondary match key; primary = `moysklad_*_id` |
| MS product folder | Mapped via `category_moysklad_mappings` (manual) |

Product without modifications → single default variant (`is_default=true`).

### 5. Single warehouse

Stock sync reads balances **only** from the warehouse identified by
`MOYSKLAD_STORE_ID` (MoySklad store UUID). No multi-warehouse aggregation in v1.

Local `quantity_reserved` (ADR-005) remains site-only. Available stock on site:
`quantity_on_hand - quantity_reserved`.

### 6. Sync strategy

**Phase A — Initial import (before webhooks):**

1. Full product + variant import via paginated API.
2. Stock import for configured warehouse.
3. New products created as `status=draft`.
4. MS photos imported as optional placeholder only (`erp_image_url`); site gallery
   is site-owned.

**Phase B — Incremental sync:**

| Trigger | Action |
|---------|--------|
| Webhook CREATE/UPDATE product/variant | Upsert ERP fields; preserve display |
| Webhook DELETE / archive | `status=archived` |
| Webhook stock/price change | Update inventory / prices |
| Cron fallback (every 10 min) | Reconcile missed events |

Webhooks are **disabled until initial import completes**.

Webhook handler: validate → enqueue job → return 200. Worker fetches fresh entity
from MS API (never trust webhook payload for prices/amounts).

**Rate limits:** MS API — 100 req / 5 sec, max 5 parallel. Queue uses backoff.

### 7. Category mapping (8.3)

MoySklad product folders ≠ site categories. Mapping table
`category_moysklad_mappings` links `category_id` ↔ `moysklad_folder_id`.

- Admin UI for manual mapping (Phase 4).
- Unmapped MS products import into a configurable default category or remain
  uncategorized.

### 8. Product images (8.4)

- `product_images` table — site-owned gallery (sort order, alt text).
- `products.image_url` — primary display image (site).
- MS images stored as `erp_image_url` fallback on first import only; not overwritten
  on subsequent syncs if admin uploaded custom images.

Future: S3/CDN upload (existing backlog) replaces local `/media`.

### 9. SEO fields (8.5)

Add `meta_title`, `meta_description` on products — site-only, never synced from MS.
Used in PDP `<head>` and JSON-LD.

### 10. Physical attributes (8.6)

Sync from MS to variants: `barcode`, `weight_grams`, `dimensions_cm` (JSON).
Read-only in admin; used later for shipping integrations.

### 11. Monitoring (8.7)

Admin page `/admin/integrations/moysklad`:

- Last successful sync timestamp
- Error count (24h)
- Unmapped categories / products without photos
- Manual «Sync now» trigger
- Webhook registration status

Backend: `integration_sync_logs` table + `GET /api/v1/admin/integrations/moysklad/status`.

### 12. Order export to MoySklad (8.1 — Phase 3)

On verified payment success (same invariant as ADR-003/004):

```
Order paid → CreateCustomerOrder in MoySklad → store MS order ID on local order
```

- Idempotent: one MS order per site order (`moysklad_order_id` on orders).
- Customer created/linked as MS counterparty.
- Line items matched by `moysklad_variant_id`.
- Failure: retry queue + admin alert; does not block order confirmation on site.

### 13. Returns (8.12 — Phase 5 backlog)

Returns processed in MoySklad → future webhook/sync to update site order status.
Out of initial scope; hook reserved in sync log entity types.

### 14. Security

- `MOYSKLAD_API_TOKEN` via env (`SecretStr`); never logged.
- Webhook endpoint: shared secret header verification.
- Idempotency: dedupe by MS event href + payload hash in `integration_sync_logs`.
- Admin integration endpoints: RBAC `integrations:write`.

### 15. Admin UX

For `sync_source=moysklad` products:

- ERP fields: read-only + badge «Из МойСклад» + `last_synced_at`.
- Filter «Требует оформления» (`draft` + no `image_url`).
- Deep link «Открыть в МойСклад».
- Inventory PATCH rejected for synced variants.
- Variant create/delete rejected for synced products.

### 16. Delivery phases

| Phase | Scope | Items |
|-------|-------|-------|
| **1** | Foundation | ADR-010, schema, MS client, ACL mappers, admin guards, status API |
| **2** | Catalog import | Full + incremental product/variant/price sync, draft workflow |
| **3** | Stock sync | Single-warehouse balances, webhooks, cron fallback |
| **4** | Display layer | Gallery, SEO fields, category mapping UI, admin UX polish |
| **5** | Order export | Customer orders → MS, counterparty sync |
| **6** | Operations | Monitoring dashboard, manual resync, returns hook (backlog) |

## Considered Options

### Option A: MoySklad as sole source — no local overlay

- **Pros:** Simpler data model.
- **Cons:** Cannot customize display without changing MS; bad for SEO/branding.
- **Rejected.**

### Option B: Bidirectional sync (edit prices in admin → push to MS)

- **Pros:** Flexible for merchants.
- **Cons:** Conflict resolution complexity; violates stated requirement.
- **Rejected.**

### Option C: Overlay + unidirectional MS → site (chosen)

- **Pros:** Clear ownership; matches business rules; aligns with DDD ACL pattern.
- **Cons:** Two layers to maintain; admin must understand field ownership.

### Option D: Real-time only (webhooks, no cron)

- **Pros:** Minimal infrastructure.
- **Cons:** Missed webhooks cause drift; MS recommends webhooks + polling.
- **Rejected** — cron fallback required.

## Consequences

### Positive

- Clear separation: operations in MS, merchandising on site.
- Reuses existing catalog/inventory/checkout without rewrite.
- Phased delivery allows catalog go-live before order export.
- Single-warehouse config keeps stock logic simple.

### Negative

- Admin catalog/inventory APIs need sync-aware validation.
- Initial import of large catalogs requires rate-limit-aware batching.
- Order export (Phase 5) is mandatory for long-term stock accuracy in MS.
- `manual` vs `moysklad` products coexist — admin must understand the distinction.

### Migration impact

- Migration `014`: additive columns and new tables; existing products default to
  `sync_source=manual`.
- No breaking changes to public catalog API.

## Related

- ADR-002 — Product variants
- ADR-005 — Inventory reservations
- ADR-007 — Admin panel
- ADR-008 — Wholesale pricing
- ADR-009 — Product content
- `.cursor/rules/integrations/00-integrations.mdc`
