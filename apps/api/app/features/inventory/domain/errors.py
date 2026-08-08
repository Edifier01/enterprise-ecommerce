"""Inventory domain errors."""

from uuid import UUID


class InventoryItemMissingError(Exception):
    def __init__(self, variant_id: UUID) -> None:
        super().__init__(f"No inventory_items row for variant {variant_id}")
        self.variant_id = variant_id
