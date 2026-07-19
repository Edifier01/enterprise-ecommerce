"""Tests for MoySklad sync field guards (ADR-010)."""

import pytest

from app.features.integrations.moysklad.domain.sync_guard import (
    SyncProtectedFieldError,
    UpdateProductDataLike,
    UpdateVariantDataLike,
    assert_inventory_adjust_allowed,
    assert_product_update_allowed,
    assert_variant_create_allowed,
    assert_variant_update_allowed,
)


def test_manual_product_allows_price_update() -> None:
    assert_product_update_allowed("manual", UpdateProductDataLike(price_cents=1000))


def test_moysklad_product_blocks_price_update() -> None:
    with pytest.raises(SyncProtectedFieldError):
        assert_product_update_allowed("moysklad", UpdateProductDataLike(price_cents=1000))


def test_moysklad_variant_blocks_sku_update() -> None:
    with pytest.raises(SyncProtectedFieldError):
        assert_variant_update_allowed("moysklad", UpdateVariantDataLike(sku="NEW-SKU"))


def test_moysklad_variant_blocks_create() -> None:
    with pytest.raises(SyncProtectedFieldError):
        assert_variant_create_allowed("moysklad")


def test_moysklad_inventory_blocks_adjust() -> None:
    with pytest.raises(SyncProtectedFieldError):
        assert_inventory_adjust_allowed("moysklad")
