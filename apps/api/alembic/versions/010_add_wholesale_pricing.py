"""add wholesale pricing and wholesaler customer flag

Revision ID: 010_add_wholesale_pricing
Revises: 009_add_product_status
Create Date: 2026-07-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "010_add_wholesale_pricing"
down_revision: Union[str, None] = "009_add_product_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "product_variants",
        sa.Column("wholesale_price_cents", sa.Integer(), nullable=True),
    )
    op.execute(
        "UPDATE product_variants SET wholesale_price_cents = (price_cents * 80) / 100"
    )
    op.create_check_constraint(
        "ck_product_variants_wholesale_non_negative",
        "product_variants",
        "wholesale_price_cents IS NULL OR wholesale_price_cents >= 0",
    )
    op.create_check_constraint(
        "ck_product_variants_wholesale_lte_retail",
        "product_variants",
        "wholesale_price_cents IS NULL OR wholesale_price_cents <= price_cents",
    )

    op.add_column(
        "users",
        sa.Column("is_wholesaler", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("users", "is_wholesaler")
    op.drop_constraint("ck_product_variants_wholesale_lte_retail", "product_variants", type_="check")
    op.drop_constraint("ck_product_variants_wholesale_non_negative", "product_variants", type_="check")
    op.drop_column("product_variants", "wholesale_price_cents")
