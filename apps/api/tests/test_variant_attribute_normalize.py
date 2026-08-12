"""Variant attribute normalization rules for MoySklad aliases."""

from app.features.catalog.domain.variant_attribute_normalize import (
    extract_size_from_name,
    normalize_variant_attributes,
)


def test_normalize_variant_attributes_maps_shoe_size_alias() -> None:
    assert normalize_variant_attributes({"размер обуви": "39"})["size"] == "39"


def test_extract_size_from_name_reads_trailing_parenthesized_size() -> None:
    assert extract_size_from_name("Кроссовки Elkland (39)") == "39"


def test_normalize_variant_attributes_maps_belt_size_alias() -> None:
    normalized = normalize_variant_attributes({"размер ремня": "110"})
    assert normalized["size"] == "110"
