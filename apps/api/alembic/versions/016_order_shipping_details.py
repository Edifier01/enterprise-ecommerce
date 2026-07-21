"""Persist checkout shipping details on sessions and orders.

Revision ID: 016_order_shipping_details
Revises: 015_variant_selector_ux
Create Date: 2026-07-20
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "016_order_shipping_details"
down_revision: Union[str, None] = "015_variant_selector_ux"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("checkout_sessions", "orders"):
        op.add_column(
            table,
            sa.Column("shipping_recipient_name", sa.String(length=255), nullable=True),
        )
        op.add_column(
            table,
            sa.Column("shipping_phone", sa.String(length=32), nullable=True),
        )
        op.add_column(
            table,
            sa.Column("shipping_address", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    for table in ("orders", "checkout_sessions"):
        op.drop_column(table, "shipping_address")
        op.drop_column(table, "shipping_phone")
        op.drop_column(table, "shipping_recipient_name")
