"""Map catalog domain entities to public API schemas (ADR-008 visibility rules)."""

from app.features.catalog.domain.entities import Product, ProductVariant
from app.features.catalog.domain.variant_options import build_option_groups
from app.features.catalog.presentation.schemas import (
    ProductImagePublicSchema,
    ProductOptionGroupSchema,
    ProductSchema,
    ProductVariantSchema,
)
from app.features.integrations.moysklad.infrastructure.persistence.models import ProductImageModel


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


def _option_groups_schema(product: Product) -> list[ProductOptionGroupSchema]:
    groups = build_option_groups(product.variants)
    return [
        ProductOptionGroupSchema(key=group.key, label=group.label, values=list(group.values))
        for group in groups
    ]


def _images_schema(images: list[ProductImageModel] | None) -> list[ProductImagePublicSchema]:
    if not images:
        return []
    return [ProductImagePublicSchema.model_validate(image) for image in images]


def product_to_schema(
    product: Product,
    *,
    show_wholesale: bool,
    images: list[ProductImageModel] | None = None,
) -> ProductSchema:
    return ProductSchema(
        id=product.id,
        name=product.name,
        slug=product.slug,
        price_cents=product.price_cents,
        compare_at_price_cents=product.compare_at_price_cents,
        currency=product.currency,
        in_stock=product.in_stock,
        category_id=product.category_id,
        description=product.description,
        image_url=product.image_url,
        meta_title=product.meta_title,
        meta_description=product.meta_description,
        option_groups=_option_groups_schema(product),
        images=_images_schema(images),
        variants=[
            variant_to_schema(variant, show_wholesale=show_wholesale)
            for variant in product.variants
        ],
    )
