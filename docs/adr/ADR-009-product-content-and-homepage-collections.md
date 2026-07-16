# ADR-009: Product Content Fields and Homepage Collections

## Status

Accepted — 2026-07-16

## Context

The storefront homepage uses client-side mock filtering in `SectionTabs` (reverse array, even-index
"sale" items, fabricated compare-at prices). Product cards and PDP show placeholder images and
generic description text. Categories expose no product counts.

Production launch requires real merchandising tied to the existing list API filters.

## Decision

1. Add nullable `products.description` (Text) and `products.image_url` (String) columns.
   Wave 1 uses URL strings only — no S3/CDN integration.

2. Homepage collections reuse `GET /api/v1/products` with existing filters:
   - **Хиты сезона:** `in_stock=true`, `sort=default`
   - **Новинки:** `sort=default` (`created_at DESC`)
   - **Распродажа:** `on_sale=true`

3. «Смотреть все» links map to filtered catalog URLs (`/catalog?in_stock=1`, `/catalog?on_sale=1`).

4. `GET /api/v1/categories` includes `product_count` (active products per primary category).

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| Dedicated `/collections/{id}` API | Over-engineering; filters already cover use cases |
| S3 image upload now | Out of scope; URL field sufficient for Wave 1 |
| Client-side SectionTabs filtering | Misleading sale badges; not production-ready |

## Consequences

- Positive: homepage, PLP, and PDP show consistent real data; admin can edit content fields.
- Negative: existing DBs need migration; seed re-run required for RUB/subcategories on fresh DB.

## Related

- ADR-002 (variants, compare-at pricing)
- `apps/web/src/components/store/catalog/section-tabs.tsx`
