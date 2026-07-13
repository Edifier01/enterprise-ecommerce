"""Map catalog domain entities to public API schemas (ADR-008 visibility rules)."""

from app.features.catalog.domain.entities import Product, ProductVariant
from app.features.catalog.presentation.schemas import ProductSchema, ProductVariantSchema


def variant_to_schema(variant: ProductVariant, *, show_wholesale: bool) -> ProductVariantSchema:
    data = {
        "id": variant.id,
        "sku": variant.sku,
        "name": variant.name,
        "price_cents": variant.price_cents,
        "in_stock": variant.in_stock,
        "is_default": variant.is_default,
        "sort_order": variant.sort_order,
        "attributes": variant.attributes,
    }
    if show_wholesale and variant.wholesale_price_cents is not None:
        data["wholesale_price_cents"] = variant.wholesale_price_cents
    return ProductVariantSchema(**data)


def product_to_schema(product: Product, *, show_wholesale: bool) -> ProductSchema:
    return ProductSchema(
        id=product.id,
        name=product.name,
        slug=product.slug,
        price_cents=product.price_cents,
        compare_at_price_cents=product.compare_at_price_cents,
        currency=product.currency,
        in_stock=product.in_stock,
        category_id=product.category_id,
        variants=[
            variant_to_schema(variant, show_wholesale=show_wholesale)
            for variant in product.variants
        ],
    )
