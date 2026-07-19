"""Tests for MoySklad webhook payload parsing."""

from app.features.integrations.moysklad.application.webhook_handler import (
    event_dedup_key,
    parse_webhook_events,
)


def test_parse_webhook_product_update() -> None:
    payload = {
        "events": [
            {
                "accountId": "acc-1",
                "action": "UPDATE",
                "meta": {
                    "type": "product",
                    "href": "https://api.moysklad.ru/api/remap/1.2/entity/product/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                },
            }
        ]
    }
    events = parse_webhook_events(payload)
    assert len(events) == 1
    assert events[0]["entity_type"] == "product"
    assert events[0]["entity_id"] == "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
    assert events[0]["action"] == "UPDATE"


def test_parse_webhook_customerorder_update() -> None:
    payload = {
        "events": [
            {
                "action": "UPDATE",
                "meta": {
                    "type": "customerorder",
                    "href": "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                },
            }
        ]
    }
    events = parse_webhook_events(payload)
    assert len(events) == 1
    assert events[0]["entity_type"] == "customerorder"
    assert events[0]["entity_id"] == "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
    assert events[0]["action"] == "UPDATE"


def test_parse_webhook_ignores_unsupported_types() -> None:
    payload = {
        "events": [
            {
                "action": "CREATE",
                "meta": {
                    "type": "demand",
                    "href": "https://api.moysklad.ru/api/remap/1.2/entity/demand/aaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                },
            }
        ]
    }
    assert parse_webhook_events(payload) == []


def test_event_dedup_key_stable() -> None:
    event = {"entity_type": "variant", "entity_id": "id-1", "action": "UPDATE", "account_id": ""}
    assert event_dedup_key(event) == event_dedup_key(event)
