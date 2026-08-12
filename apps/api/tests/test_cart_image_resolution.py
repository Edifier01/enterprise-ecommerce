"""Cart line image URL precedence."""

from types import SimpleNamespace

from app.core.config import settings
from app.features.checkout.application.cart_service import CartService


def _product(*, image_url: str | None, erp_image_url: str | None = None):
    return SimpleNamespace(slug="test-product", image_url=image_url, erp_image_url=erp_image_url)


def test_cart_image_falls_back_to_gallery_when_product_image_missing() -> None:
    assert (
        CartService._resolve_cart_image_url(_product(image_url=None), "/media/gallery.jpg")
        == "/media/gallery.jpg"
    )


def test_cart_image_skips_missing_media_then_uses_gallery(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(settings, "media_upload_dir", str(tmp_path))
    (tmp_path / "gallery.jpg").write_bytes(b"fake-image")

    assert (
        CartService._resolve_cart_image_url(
            _product(image_url="/media/missing.jpg"),
            "/media/gallery.jpg",
        )
        == "/media/gallery.jpg"
    )


def test_cart_image_falls_back_to_erp_proxy_when_no_site_image() -> None:
    assert (
        CartService._resolve_cart_image_url(
            _product(
                image_url=None,
                erp_image_url="https://api.moysklad.ru/api/remap/1.2/download/abc",
            )
        )
        == "/api/v1/products/test-product/erp-image"
    )
