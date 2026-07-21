"""Unit tests for MoySklad publish readiness rules."""

import uuid

from app.features.catalog.domain.entities import Product, ProductVariant
from app.features.catalog.domain.merchandising_readiness import (
    BLOCKER_MISSING_CATEGORY,
    BLOCKER_MISSING_COLOR_PHOTOS,
    BLOCKER_MISSING_PHOTO,
    format_publish_blockers_ru,
    get_moysklad_publish_blockers,
    has_display_photo,
    should_validate_moysklad_publish,
)


def _variant(color: str) -> ProductVariant:
    return ProductVariant(
        id=uuid.uuid4(),
        product_id=uuid.uuid4(),
        sku=f"SKU-{color}",
        name=color,
        price_cents=1000,
        in_stock=True,
        is_default=True,
        sort_order=0,
        attributes={"color": color},
    )


def test_has_display_photo_requires_site_owned_image() -> None:
    assert has_display_photo(None, 0) is False
    assert has_display_photo("  ", 0) is False
    assert has_display_photo("https://cdn.example.com/a.jpg", 0) is True
    assert has_display_photo(None, 1) is True


def test_publish_blockers_category_and_photo() -> None:
    blockers = get_moysklad_publish_blockers(
        category_id=None,
        image_url=None,
        gallery_image_count=0,
        variants=(),
        image_option_colors=[],
    )
    assert blockers == (BLOCKER_MISSING_CATEGORY, BLOCKER_MISSING_PHOTO)


def test_publish_blockers_multicolor_gallery() -> None:
    blockers = get_moysklad_publish_blockers(
        category_id=uuid.uuid4(),
        image_url="https://cdn.example.com/a.jpg",
        gallery_image_count=1,
        variants=[_variant("Multicam"), _variant("Coyote")],
        image_option_colors=["Multicam"],
    )
    assert blockers == (BLOCKER_MISSING_COLOR_PHOTOS,)


def test_should_validate_only_on_moysklad_publish_transition() -> None:
    assert should_validate_moysklad_publish(
        sync_source="moysklad",
        current_status="draft",
        next_status="active",
    )
    assert not should_validate_moysklad_publish(
        sync_source="manual",
        current_status="draft",
        next_status="active",
    )
    assert not should_validate_moysklad_publish(
        sync_source="moysklad",
        current_status="active",
        next_status="active",
    )


def test_format_publish_blockers_ru() -> None:
    message = format_publish_blockers_ru((BLOCKER_MISSING_PHOTO, BLOCKER_MISSING_CATEGORY))
    assert "нет фото" in message
    assert "нет категории" in message
