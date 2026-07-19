"""Add option_color to product gallery images (ADR-011).

Revision ID: 015_variant_selector_ux
Revises: 014_moysklad_integration
Create Date: 2026-07-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "015_variant_selector_ux"
down_revision: Union[str, None] = "014_moysklad_integration"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "product_images",
        sa.Column("option_color", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("product_images", "option_color")
