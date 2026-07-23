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


def _store_row_ids(store_row: dict[str, Any]) -> list[str]:
    ids: list[str] = []
    meta = store_row.get("meta") or {}
    for key in ("href", "uuidHref"):
        normalized = normalize_moysklad_entity_id(str(meta.get(key) or ""))
        if normalized:
            ids.append(normalized)
    store_obj = store_row.get("store")
    if isinstance(store_obj, dict):
        store_meta = store_obj.get("meta") or {}
        for key in ("href", "uuidHref"):
            normalized = normalize_moysklad_entity_id(str(store_meta.get(key) or ""))
            if normalized:
                ids.append(normalized)
    return ids


def quantity_for_store(row: dict[str, Any], store_id: str) -> float:
    normalized_store_id = normalize_moysklad_entity_id(store_id)
    stock_by_store = row.get("stockByStore") or []

    for store_row in stock_by_store:
        if normalized_store_id in _store_row_ids(store_row):
            return _read_quantity(store_row)

    if stock_by_store:
        if len(stock_by_store) == 1:
            store_row = stock_by_store[0]
            if not _store_row_ids(store_row):
                return _read_quantity(store_row)
        return 0.0

    return _read_quantity(row)


def _read_quantity(source: dict[str, Any]) -> float:
    for key in ("stock", "quantity", "freeStock"):
        raw = source.get(key)
        if raw is not None:
            return float(raw or 0)
    return 0.0


def parse_store_filtered_stock_rows(
    rows: list[dict[str, Any]],
    store_id: str = "",
) -> dict[str, int]:
    """Parse /report/stock/all rows filtered by storeId.

    MoySklad often returns stock only inside stockByStore[], not as a flat field.
    When store_id is provided, delegate to parse_stock_report_rows.
    """
    if store_id:
        return parse_stock_report_rows(rows, store_id)
    stock: dict[str, int] = {}
    for row in rows:
        assortment_id = extract_assortment_id(row)
        if not assortment_id:
            continue
        stock[assortment_id] = int(_read_quantity(row))
    return stock


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
