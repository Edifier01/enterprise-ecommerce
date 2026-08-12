"""Normalize MoySklad characteristic keys and recover size from variant names.

Storefront structured selectors expect canonical keys: size / color / waist.
MS often sends aliases like «размер обуви» which must map to size without a re-sync.
"""

from __future__ import annotations

import re

_SIZE_EXACT = frozenset(
    {
        "size",
        "размер",
        "размер обуви",
        "размер ремня",
        "shoe size",
        "belt size",
    }
)
_COLOR_EXACT = frozenset(
    {
        "color",
        "цвет",
        "камуфляж",
        "camouflage",
        "расцветка",
    }
)
_WAIST_EXACT = frozenset(
    {
        "waist",
        "талия",
        "обхват талии",
    }
)

_SIZE_IN_PARENS = re.compile(r"\(([^)]+)\)\s*$")
_SIZE_VALUE = re.compile(
    r"^(?:"
    r"\d{2,3}(?:\s*[-–]\s*\d{2,3})?"
    r"|[XxSsMmLl]{1,3}"
    r")$"
)


def _canonical_key(raw_key: str) -> str | None:
    key = raw_key.strip().casefold()
    if not key:
        return None
    if key in _SIZE_EXACT or ("размер" in key and "цвет" not in key):
        return "size"
    if key in _COLOR_EXACT or "цвет" in key or "камуфляж" in key or "camouflage" in key:
        return "color"
    if key in _WAIST_EXACT or "талия" in key:
        return "waist"
    return None


def extract_size_from_name(name: str | None) -> str | None:
    if not name or not name.strip():
        return None
    match = _SIZE_IN_PARENS.search(name.strip())
    if not match:
        return None
    candidate = match.group(1).strip().replace("–", "-")
    candidate = re.sub(r"\s*-\s*", "-", candidate)
    if _SIZE_VALUE.match(candidate):
        return candidate
    return None


def normalize_variant_attributes(
    attributes: dict[str, str] | None,
    *,
    name: str | None = None,
) -> dict[str, str]:
    source = attributes or {}
    normalized = {str(key): str(value) for key, value in source.items() if value is not None}

    for raw_key, value in list(normalized.items()):
        canonical = _canonical_key(str(raw_key))
        if canonical is None:
            continue
        trimmed = str(value).strip()
        if not trimmed:
            continue
        if not normalized.get(canonical):
            normalized[canonical] = trimmed

    if not (normalized.get("size") or "").strip():
        from_name = extract_size_from_name(name)
        if from_name:
            normalized["size"] = from_name

    return normalized
