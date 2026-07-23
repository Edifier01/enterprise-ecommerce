"""Public catalog serializer display rules."""

from uuid import uuid4

from app.core.config import settings
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
        erp_image_url="https://api.moysklad.ru/api/remap/1.2/download/abc",
        variants=(),
    )

    schema = product_to_schema(product, show_wholesale=False)

    assert schema.image_url == "/api/v1/products/test-product/erp-image"


def test_product_to_schema_skips_missing_media_file(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(settings, "media_upload_dir", str(tmp_path))

    product = Product(
        id=uuid4(),
        name="Test",
        slug="test-product",
        price_cents=1000,
        currency="RUB",
        in_stock=True,
        image_url="/media/missing.jpg",
        erp_image_url="https://api.moysklad.ru/api/remap/1.2/download/abc",
        variants=(),
    )

    schema = product_to_schema(product, show_wholesale=False)

    assert schema.image_url == "/api/v1/products/test-product/erp-image"


def test_product_to_schema_normalizes_moysklad_download_in_image_url() -> None:
    product = Product(
        id=uuid4(),
        name="Test",
        slug="test-product",
        price_cents=1000,
        currency="RUB",
        in_stock=True,
        image_url="https://api.moysklad.ru/api/remap/1.2/download/abc",
        erp_image_url="https://api.moysklad.ru/api/remap/1.2/download/abc",
        variants=(),
    )

    schema = product_to_schema(product, show_wholesale=False)

    assert schema.image_url == "/api/v1/products/test-product/erp-image"


def test_product_to_schema_falls_back_to_gallery_when_image_url_missing(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setattr(settings, "media_upload_dir", str(tmp_path))
    (tmp_path / "gallery-primary.jpg").write_bytes(b"fake-image")

    product_id = uuid4()
    product = Product(
        id=product_id,
        name="Test",
        slug="test-product",
        price_cents=1000,
        currency="RUB",
        in_stock=True,
        image_url=None,
        erp_image_url=None,
        variants=(),
    )
    gallery_image = type(
        "GalleryImage",
        (),
        {
            "id": uuid4(),
            "product_id": product_id,
            "url": "/media/gallery-primary.jpg",
            "alt_text": "Front",
            "sort_order": 0,
            "option_color": None,
        },
    )()

    schema = product_to_schema(product, show_wholesale=False, images=[gallery_image])

    assert schema.image_url == "/media/gallery-primary.jpg"
