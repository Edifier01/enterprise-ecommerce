"""add updated_at and price_cents non-negative constraint

Revision ID: 002_add_updated_at_price_constraint
Revises: 001_add_products
Create Date: 2026-07-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_add_updated_at_price_constraint"
down_revision: Union[str, None] = "001_add_products"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_products_price_cents_non_negative",
        "products",
        "price_cents >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_products_price_cents_non_negative", "products", type_="check")
    op.drop_column("products", "updated_at")
