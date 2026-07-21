"""Merchandising readiness rules before publishing MoySklad products (ADR-010, ADR-011)."""

from uuid import UUID

from app.features.catalog.domain.color_gallery_coverage import needs_color_photos
from app.features.catalog.domain.entities import Product, ProductVariant
from app.features.catalog.domain.storefront_visibility import SYNC_SOURCE_MOYSKLAD

BLOCKER_MISSING_CATEGORY = "missing_category"
BLOCKER_MISSING_PHOTO = "missing_photo"
BLOCKER_MISSING_COLOR_PHOTOS = "missing_color_photos"

BLOCKER_LABELS_RU: dict[str, str] = {
    BLOCKER_MISSING_CATEGORY: "нет категории",
    BLOCKER_MISSING_PHOTO: "нет фото",
    BLOCKER_MISSING_COLOR_PHOTOS: "не все цвета в галерее",
}


def has_display_photo(image_url: str | None, gallery_image_count: int) -> bool:
    """Site-owned display photo only — erp_image_url is not sufficient (ADR-010 §8)."""
    return bool(image_url and image_url.strip()) or gallery_image_count > 0


def get_moysklad_publish_blockers(
    *,
    category_id: UUID | None,
    image_url: str | None,
    gallery_image_count: int,
    variants: tuple[ProductVariant, ...] | list[ProductVariant],
    image_option_colors: list[str | None],
) -> tuple[str, ...]:
    blockers: list[str] = []
    if category_id is None:
        blockers.append(BLOCKER_MISSING_CATEGORY)
    if not has_display_photo(image_url, gallery_image_count):
        blockers.append(BLOCKER_MISSING_PHOTO)
    if needs_color_photos(variants, image_option_colors):
        blockers.append(BLOCKER_MISSING_COLOR_PHOTOS)
    return tuple(blockers)


def get_moysklad_publish_blockers_for_product(
    product: Product,
    image_option_colors: list[str | None],
    *,
    gallery_image_count: int | None = None,
) -> tuple[str, ...]:
    return get_moysklad_publish_blockers(
        category_id=product.category_id,
        image_url=product.image_url,
        gallery_image_count=gallery_image_count if gallery_image_count is not None else 0,
        variants=product.variants,
        image_option_colors=image_option_colors,
    )


def should_validate_moysklad_publish(*, sync_source: str, current_status: str, next_status: str) -> bool:
    return (
        sync_source == SYNC_SOURCE_MOYSKLAD
        and next_status == "active"
        and current_status != "active"
    )


def format_publish_blockers_ru(blockers: tuple[str, ...]) -> str:
    if not blockers:
        return ""
    labels = [BLOCKER_LABELS_RU.get(code, code) for code in blockers]
    return "Перед публикацией: " + ", ".join(labels) + "."
