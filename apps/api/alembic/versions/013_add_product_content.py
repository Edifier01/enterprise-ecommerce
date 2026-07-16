"""add product description and image_url

Revision ID: 013_add_product_content
Revises: 012_auth_email_verification_tokens
Create Date: 2026-07-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "013_add_product_content"
down_revision: Union[str, None] = "012_auth_email_verification_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("products", sa.Column("image_url", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "image_url")
    op.drop_column("products", "description")
