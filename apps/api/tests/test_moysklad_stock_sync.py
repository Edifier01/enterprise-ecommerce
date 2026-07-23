"""Tests for MoySklad stock report parsing and sync behavior."""

from dataclasses import dataclass, field
from uuid import uuid4

import pytest

from app.features.integrations.moysklad.application.sync_stock import SyncMoySkladStockUseCase
from app.features.integrations.moysklad.infrastructure.ids import (
    normalize_moysklad_entity_id,
    parse_stock_bystore_rows,
)

_STORE_ID = "850ee995-f504-11e5-8a84-bae500000160"
_STORE_HREF = f"https://api.moysklad.ru/api/remap/1.2/entity/store/{_STORE_ID}"
_PRODUCT_ID = "c02e3a5c-007e-11e6-9464-e4de00000006"
_VARIANT_ID = "656c4032-8552-11e6-8a84-bae500000045"


def test_normalize_moysklad_entity_id_from_bare_uuid() -> None:
    assert normalize_moysklad_entity_id(_STORE_ID) == _STORE_ID


def test_normalize_moysklad_entity_id_from_href() -> None:
    assert normalize_moysklad_entity_id(_STORE_HREF) == _STORE_ID


def test_normalize_moysklad_entity_id_from_href_with_query() -> None:
    href = f"{_STORE_HREF}?expand=owner"
    assert normalize_moysklad_entity_id(href) == _STORE_ID


def test_parse_stock_bystore_rows_variant_and_product() -> None:
    rows = [
        {
            "meta": {
                "href": f"https://api.moysklad.ru/api/remap/1.2/entity/variant/{_VARIANT_ID}",
                "type": "variant",
            },
            "stockByStore": [
                {
                    "meta": {"href": _STORE_HREF},
                    "stock": 12,
                }
            ],
        },
        {
            "meta": {
                "href": f"https://api.moysklad.ru/api/remap/1.2/entity/product/{_PRODUCT_ID}",
                "type": "product",
            },
            "stockByStore": [
                {
                    "meta": {"href": _STORE_HREF},
                    "stock": 5,
                }
            ],
        },
    ]

    stock = parse_stock_bystore_rows(rows, _STORE_HREF)

    assert stock[_VARIANT_ID] == 12
    assert stock[_PRODUCT_ID] == 5


def test_parse_stock_bystore_rows_uses_assortment_meta_when_row_meta_missing() -> None:
    rows = [
        {
            "assortment": {
                "meta": {
                    "href": f"https://api.moysklad.ru/api/remap/1.2/entity/variant/{_VARIANT_ID}",
                    "type": "variant",
                }
            },
            "stockByStore": [
                {
                    "meta": {"href": _STORE_ID},
                    "quantity": 7,
                }
            ],
        }
    ]

    assert parse_stock_bystore_rows(rows, _STORE_ID)[_VARIANT_ID] == 7


def test_parse_store_filtered_stock_rows_flat_stock() -> None:
    rows = [
        {
            "meta": {
                "href": f"https://api.moysklad.ru/api/remap/1.2/entity/product/{_PRODUCT_ID}",
                "type": "product",
            },
            "stock": 4,
        }
    ]
    from app.features.integrations.moysklad.infrastructure.ids import parse_store_filtered_stock_rows

    assert parse_store_filtered_stock_rows(rows)[_PRODUCT_ID] == 4


def test_parse_stock_bystore_rows_zero_when_store_not_matched() -> None:
    rows = [
        {
            "meta": {
                "href": f"https://api.moysklad.ru/api/remap/1.2/entity/variant/{_VARIANT_ID}",
                "type": "variant",
            },
            "stockByStore": [
                {
                    "meta": {
                        "href": "https://api.moysklad.ru/api/remap/1.2/entity/store/other-store-id"
                    },
                    "stock": 99,
                }
            ],
        }
    ]

    assert parse_stock_bystore_rows(rows, _STORE_ID)[_VARIANT_ID] == 0


def test_parse_stock_report_rows_flat_stock_all_response() -> None:
    rows = [
        {
            "meta": {
                "href": f"https://api.moysklad.ru/api/remap/1.2/entity/product/{_PRODUCT_ID}",
                "type": "product",
            },
            "stock": 4,
            "quantity": 4,
        }
    ]

    assert parse_stock_bystore_rows(rows, _STORE_ID)[_PRODUCT_ID] == 4


def test_parse_stock_report_rows_single_store_filter_row() -> None:
    rows = [
        {
            "meta": {
                "href": f"https://api.moysklad.ru/api/remap/1.2/entity/product/{_PRODUCT_ID}",
                "type": "product",
            },
            "stockByStore": [{"stock": 5}],
        }
    ]

    assert parse_stock_bystore_rows(rows, _STORE_ID)[_PRODUCT_ID] == 5


@dataclass
class _FakeVariant:
    id: object
    moysklad_variant_id: str | None


@dataclass
class _FakeCatalogRepo:
    applied: list[tuple[object, int]] = field(default_factory=list)
    _session: object = None


class _FakeClient:
    def __init__(self, stock_map: dict[str, int]) -> None:
        self._stock_map = stock_map

    async def list_stock_by_store(
        self, *, offset: int = 0, limit: int = 1000
    ) -> tuple[dict[str, int], int, int]:
        if offset > 0:
            return {}, len(self._stock_map), 0
        return self._stock_map, len(self._stock_map), len(self._stock_map)

    async def get_assortment_stock(self, assortment_id: str) -> int:
        if assortment_id in self._stock_map:
            return self._stock_map[assortment_id]
        if assortment_id.startswith("product:"):
            return self._stock_map.get(assortment_id.removeprefix("product:"), 0)
        return 0


class _FakeResult:
    def __init__(self, rows: list[tuple[_FakeVariant, str | None]]) -> None:
        self._rows = rows

    def all(self) -> list[tuple[_FakeVariant, str | None]]:
        return self._rows


class _FakeSession:
    def __init__(self) -> None:
        self._rows = [
            (_FakeVariant(id=uuid4(), moysklad_variant_id=_VARIANT_ID), _PRODUCT_ID),
            (_FakeVariant(id=uuid4(), moysklad_variant_id="missing-in-ms"), "other-product-id"),
            (_FakeVariant(id=uuid4(), moysklad_variant_id=f"product:{_PRODUCT_ID}"), _PRODUCT_ID),
        ]

    async def execute(self, _stmt: object) -> _FakeResult:
        return _FakeResult(self._rows)

    async def flush(self) -> None:
        return None


class _FakeSyncRepo:
    async def get_state(self):
        return type("State", (), {"last_incremental_sync_at": None, "last_error": None})()

    async def log_event(self, **kwargs: object) -> None:
        return None


@pytest.mark.asyncio
async def test_sync_stock_skips_variants_missing_from_bulk_map() -> None:
    catalog = _FakeCatalogRepo()
    catalog._session = _FakeSession()

    async def apply_stock(variant: _FakeVariant, quantity: int) -> None:
        catalog.applied.append((variant, quantity))

    catalog.apply_stock = apply_stock  # type: ignore[method-assign]

    use_case = SyncMoySkladStockUseCase(
        client=_FakeClient({_VARIANT_ID: 4, _PRODUCT_ID: 9}),
        catalog_repo=catalog,
        sync_repo=_FakeSyncRepo(),
    )

    result = await use_case.execute()

    assert result.rows_applied == 2
    assert result.rows_skipped == 1
    assert result.stock_map_size == 2
    assert {quantity for _, quantity in catalog.applied} == {4, 9}
