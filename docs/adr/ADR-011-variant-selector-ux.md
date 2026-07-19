# ADR-011: Storefront Variant Selector UX

**Status:** Accepted  
**Date:** 2026-07-19

## Context

ADR-002 introduced `ProductVariant` with JSONB `attributes` (size, color). The
storefront currently renders a flat list of variant names on the PDP. Industry
patterns (Shopify, Baymard, tactical retailers) use separate axes: color swatches
and size pills, with dependent availability and optional gallery sync.

MoySklad (ADR-010) owns variant characteristics; the site owns display photos
via `product_images`.

## Decision

### 1. Structured option groups on the public product API

- Derive `option_groups[]` server-side from variant attributes (`variant_options.py`).
- Axis order: color/camouflage → size → waist.
- Color and camouflage merge into one visual axis (`color`) for swatches.
- When attributes cannot form groups, the frontend falls back to the existing
  flat variant button list.

### 2. Gallery images tagged by color (site-owned overlay)

- Add nullable `product_images.option_color` (string, matches normalized color
  axis value).
- Public `GET /products/{slug}` includes `images[]` with `option_color`.
- Selecting a color on the PDP filters/switches gallery images; fallback to
  `product.image_url` when no tagged images exist.

### 3. PLP card hints

- Show «От X ₽» when variant prices differ.
- Show up to 4 color swatch dots when a color axis exists (link to PDP).

Checkout continues to use `variant_id` only — no change to ADR-003/005.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| Client-only option parsing | Duplicates MS normalization; filters already server-side |
| `variant_id` on every image | Heavier admin UX; one photo set per color is enough |
| Separate PDP URL per color | Hurts SEO; not industry standard for this catalog size |

## Consequences

**Positive:** Professional PDP UX; gallery sync; MS import unchanged.  
**Negative:** Admin must tag gallery images by color for full photo sync.

## Related

- ADR-002, ADR-010
- `apps/api/app/features/catalog/domain/variant_options.py`
