"""MoySklad entity ID helpers (no settings dependency)."""

import re
from typing import Any

_HREF_ID_RE = re.compile(r"/([0-9a-f-]{36})$", re.IGNORECASE)
_UUID_RE = re.compile(r"^[0-9a-f]{36}$", re.IGNORECASE)


def extract_moysklad_id(href: str | None) -> str | None:
    if not href:
        return None
    path = href.split("?", 1)[0]
    match = _HREF_ID_RE.search(path)
    return match.group(1) if match else None


def normalize_moysklad_entity_id(value: str) -> str:
    """Extract UUID from a MoySklad href/URL or return a bare UUID unchanged."""
    stripped = value.strip()
    if not stripped:
        return ""
    extracted = extract_moysklad_id(stripped)
    if extracted:
        return extracted
    if _UUID_RE.fullmatch(stripped):
        return stripped
    return stripped


def extract_assortment_id(row: dict[str, Any]) -> str | None:
    meta_href = (row.get("meta") or {}).get("href")
    assortment_id = extract_moysklad_id(meta_href)
    if assortment_id:
        return assortment_id
    assortment = row.get("assortment")
    if isinstance(assortment, dict):
        return extract_moysklad_id((assortment.get("meta") or {}).get("href"))
    return None


def quantity_for_store(row: dict[str, Any], store_id: str) -> float:
    normalized_store_id = normalize_moysklad_entity_id(store_id)
    stock_by_store = row.get("stockByStore") or []

    for store_row in stock_by_store:
        store_href = (store_row.get("meta") or {}).get("href", "")
        if not store_href:
            store_obj = store_row.get("store")
            if isinstance(store_obj, dict):
                store_href = (store_obj.get("meta") or {}).get("href", "")
        if normalize_moysklad_entity_id(store_href) == normalized_store_id:
            return _read_quantity(store_row)

    # When the report is filtered by store, MS may return one stockByStore row without store meta.
    if len(stock_by_store) == 1:
        store_row = stock_by_store[0]
        store_href = (store_row.get("meta") or {}).get("href", "")
        if not store_href:
            store_obj = store_row.get("store")
            if isinstance(store_obj, dict):
                store_href = (store_obj.get("meta") or {}).get("href", "")
        if not store_href or normalize_moysklad_entity_id(store_href) == normalized_store_id:
            return _read_quantity(store_row)
        return 0.0

    # /report/stock/all rows expose stock directly on the assortment row.
    return _read_quantity(row)


def _read_quantity(source: dict[str, Any]) -> float:
    for key in ("stock", "quantity", "freeStock"):
        raw = source.get(key)
        if raw is not None:
            return float(raw or 0)
    return 0.0


def parse_stock_report_rows(rows: list[dict[str, Any]], store_id: str) -> dict[str, int]:
    """Map MoySklad assortment UUID (product or variant) to on-hand quantity for one store."""
    stock: dict[str, int] = {}
    for row in rows:
        assortment_id = extract_assortment_id(row)
        if not assortment_id:
            continue
        stock[assortment_id] = int(quantity_for_store(row, store_id))
    return stock


def parse_stock_bystore_rows(rows: list[dict[str, Any]], store_id: str) -> dict[str, int]:
    """Backward-compatible alias for stock report row parsing."""
    return parse_stock_report_rows(rows, store_id)
