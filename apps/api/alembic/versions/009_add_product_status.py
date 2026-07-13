"""add product status

Revision ID: 009_add_product_status
Revises: 008_add_admin_users
Create Date: 2026-07-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009_add_product_status"
down_revision: Union[str, None] = "008_add_admin_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
    )
    op.create_check_constraint(
        "ck_products_status",
        "products",
        "status IN ('draft', 'active', 'archived')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_products_status", "products", type_="check")
    op.drop_column("products", "status")
