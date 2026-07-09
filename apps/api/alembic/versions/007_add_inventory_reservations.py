"""add inventory reservations

Revision ID: 007_add_inventory_reservations
Revises: 006_add_checkout_payments_orders
Create Date: 2026-07-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_add_inventory_reservations"
down_revision: Union[str, None] = "006_add_checkout_payments_orders"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "inventory_items",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "variant_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("product_variants.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("quantity_on_hand", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("quantity_reserved", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "quantity_on_hand >= 0",
            name="ck_inventory_items_on_hand_non_negative",
        ),
        sa.CheckConstraint(
            "quantity_reserved >= 0",
            name="ck_inventory_items_reserved_non_negative",
        ),
        sa.CheckConstraint(
            "quantity_on_hand >= quantity_reserved",
            name="ck_inventory_items_on_hand_gte_reserved",
        ),
    )
    op.create_index("ix_inventory_items_variant_id", "inventory_items", ["variant_id"], unique=True)

    op.create_table(
        "inventory_reservations",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "variant_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("product_variants.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("reference_type", sa.String(64), nullable=False),
        sa.Column("reference_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "quantity > 0",
            name="ck_inventory_reservations_quantity_positive",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'committed', 'released', 'expired')",
            name="ck_inventory_reservations_status",
        ),
        sa.UniqueConstraint(
            "variant_id",
            "reference_type",
            "reference_id",
            name="uq_inventory_reservations_variant_reference",
        ),
    )
    op.create_index(
        "ix_inventory_reservations_variant_id",
        "inventory_reservations",
        ["variant_id"],
    )
    op.create_index(
        "ix_inventory_reservations_reference",
        "inventory_reservations",
        ["reference_type", "reference_id"],
    )
    op.create_index(
        "ix_inventory_reservations_status",
        "inventory_reservations",
        ["status"],
    )
    op.create_index(
        "ix_inventory_reservations_expires_at",
        "inventory_reservations",
        ["expires_at"],
    )

    op.execute(
        sa.text(
            """
            INSERT INTO inventory_items (id, variant_id, quantity_on_hand, quantity_reserved, version)
            SELECT id, id, 0, 0, 0
            FROM product_variants
            WHERE id NOT IN (SELECT variant_id FROM inventory_items)
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_inventory_reservations_expires_at", table_name="inventory_reservations")
    op.drop_index("ix_inventory_reservations_status", table_name="inventory_reservations")
    op.drop_index("ix_inventory_reservations_reference", table_name="inventory_reservations")
    op.drop_index("ix_inventory_reservations_variant_id", table_name="inventory_reservations")
    op.drop_table("inventory_reservations")

    op.drop_index("ix_inventory_items_variant_id", table_name="inventory_items")
    op.drop_table("inventory_items")
