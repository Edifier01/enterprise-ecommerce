"""ERP stock reconciliation — awaiting fulfillment counter and order settlement."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "021_erp_stock_reconciliation"
down_revision: Union[str, None] = "020_admin_bulk_jobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "inventory_items",
        sa.Column(
            "quantity_awaiting_fulfillment",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.create_check_constraint(
        "ck_inventory_items_awaiting_non_negative",
        "inventory_items",
        "quantity_awaiting_fulfillment >= 0",
    )
    op.drop_constraint(
        "ck_inventory_items_on_hand_gte_reserved",
        "inventory_items",
        type_="check",
    )

    op.add_column(
        "orders",
        sa.Column("erp_fulfilled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_orders_unfulfilled_moysklad_export",
        "orders",
        ["created_at"],
        postgresql_where=sa.text(
            "moysklad_order_id IS NOT NULL AND erp_fulfilled_at IS NULL"
        ),
    )

    op.execute(
        sa.text(
            """
            UPDATE inventory_items i
            SET quantity_awaiting_fulfillment = COALESCE((
                SELECT SUM(ol.quantity)
                FROM order_lines ol
                JOIN orders o ON o.id = ol.order_id
                WHERE ol.variant_id = i.variant_id
                  AND o.status = 'confirmed'
                  AND o.moysklad_order_id IS NOT NULL
            ), 0)
            """
        )
    )

    op.execute(
        sa.text(
            """
            UPDATE orders
            SET erp_fulfilled_at = updated_at
            WHERE status = 'shipped'
              AND moysklad_order_id IS NOT NULL
              AND erp_fulfilled_at IS NULL
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    violating = conn.execute(
        sa.text(
            """
            SELECT COUNT(*) FROM inventory_items
            WHERE quantity_on_hand < quantity_reserved
            """
        )
    ).scalar()
    if violating and int(violating) > 0:
        raise RuntimeError(
            f"Cannot downgrade: {violating} inventory row(s) violate "
            "quantity_on_hand >= quantity_reserved"
        )

    op.drop_index("ix_orders_unfulfilled_moysklad_export", table_name="orders")
    op.drop_column("orders", "erp_fulfilled_at")

    op.create_check_constraint(
        "ck_inventory_items_on_hand_gte_reserved",
        "inventory_items",
        "quantity_on_hand >= quantity_reserved",
    )
    op.drop_constraint(
        "ck_inventory_items_awaiting_non_negative",
        "inventory_items",
        type_="check",
    )
    op.drop_column("inventory_items", "quantity_awaiting_fulfillment")
