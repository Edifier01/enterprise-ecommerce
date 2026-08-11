"""Product preview token service tests."""

from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.features.catalog.infrastructure.security.product_preview_token_service import (
    InvalidProductPreviewTokenError,
    ProductPreviewTokenService,
)


def test_preview_token_roundtrip() -> None:
    service = ProductPreviewTokenService("test-secret-key-32chars-minimum!!", "HS256", 15)
    product_id = uuid4()
    slug = "demo-product"

    token, expires_at = service.create_token(product_id, slug)
    claims = service.verify_token(token)

    assert claims.product_id == product_id
    assert claims.slug == slug
    assert expires_at > datetime.now(timezone.utc)


def test_preview_token_rejects_wrong_scope() -> None:
    from jose import jwt

    service = ProductPreviewTokenService("test-secret-key-32chars-minimum!!", "HS256", 15)
    bad = jwt.encode(
        {
            "sub": str(uuid4()),
            "slug": "x",
            "scope": "admin",
            "exp": datetime.now(timezone.utc).timestamp() + 60,
        },
        "test-secret-key-32chars-minimum!!",
        algorithm="HS256",
    )
    with pytest.raises(InvalidProductPreviewTokenError):
        service.verify_token(bad)
