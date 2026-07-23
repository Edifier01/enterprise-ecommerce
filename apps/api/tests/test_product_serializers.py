"""Public catalog serializer display rules."""

from uuid import uuid4

from app.features.catalog.domain.entities import Product
from app.features.catalog.presentation.serializers import product_to_schema


def test_product_to_schema_prefers_site_image_url() -> None:
    product = Product(
        id=uuid4(),
        name="Test",
        slug="test-product",
        price_cents=1000,
        currency="RUB",
        in_stock=True,
        image_url="https://cdn.example.com/site.jpg",
        erp_image_url="https://cdn.example.com/ms.jpg",
        variants=(),
    )

    schema = product_to_schema(product, show_wholesale=False)

    assert schema.image_url == "https://cdn.example.com/site.jpg"


def test_product_to_schema_falls_back_to_erp_image_url() -> None:
    product = Product(
        id=uuid4(),
        name="Test",
        slug="test-product",
        price_cents=1000,
        currency="RUB",
        in_stock=True,
        image_url=None,
        erp_image_url="https://cdn.example.com/ms.jpg",
        variants=(),
    )

    schema = product_to_schema(product, show_wholesale=False)

    assert schema.image_url == "https://cdn.example.com/ms.jpg"
