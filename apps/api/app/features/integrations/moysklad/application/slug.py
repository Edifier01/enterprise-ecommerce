"""Slug helpers for MoySklad import."""

import re
import uuid

_CYRILLIC_MAP = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "e",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}


def transliterate(text: str) -> str:
    result: list[str] = []
    for char in text.casefold():
        result.append(_CYRILLIC_MAP.get(char, char))
    return "".join(result)


def slugify(name: str) -> str:
    normalized = transliterate(name.strip().casefold())
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    normalized = re.sub(r"-{2,}", "-", normalized).strip("-")
    return normalized or f"product-{uuid.uuid4().hex[:8]}"


async def unique_slug(base: str, exists) -> str:
    candidate = slugify(base)
    if not await exists(candidate):
        return candidate
    for index in range(2, 100):
        slug = f"{candidate}-{index}"
        if not await exists(slug):
            return slug
    return f"{candidate}-{uuid.uuid4().hex[:8]}"
