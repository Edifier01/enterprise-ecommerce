"""MoySklad variant mapping keeps storefront attributes canonical."""

from app.features.integrations.moysklad.infrastructure.http_client import MoySkladApiClient


def test_map_variant_normalizes_characteristic_alias_and_name_size() -> None:
    client = MoySkladApiClient("token")
    variant = client._map_variant(
        {
            "id": "variant-id",
            "name": "Кроссовки Elkland (39)",
            "code": "SHOE-39",
            "product": {"meta": {"href": "https://api.moysklad.ru/api/remap/1.2/entity/product/product-id"}},
            "characteristics": [{"name": "размер обуви", "value": "39"}],
            "salePrices": [{"value": 10000, "priceType": {"name": "Цена продажи"}}],
        }
    )

    assert variant.name == "Кроссовки Elkland (39)"
    assert variant.attributes["size"] == "39"
