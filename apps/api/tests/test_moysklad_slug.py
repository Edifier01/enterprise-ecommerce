"""Tests for MoySklad slug helper."""

from app.features.integrations.moysklad.application.slug import slugify


def test_slugify_cyrillic_name() -> None:
    slug = slugify("Тактическая куртка M-TAC")
    assert " " not in slug
    assert slug
