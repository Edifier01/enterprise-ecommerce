"""add user names and wholesaler profiles

Revision ID: 011_user_profiles_wholesaler
Revises: 010_add_wholesale_pricing
Create Date: 2026-07-13

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011_user_profiles_wholesaler"
down_revision: Union[str, None] = "010_add_wholesale_pricing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=100), nullable=True))

    op.create_table(
        "wholesaler_profiles",
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("edo_provider", sa.String(length=255), nullable=False),
        sa.Column("edo_id", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("inn", sa.String(length=12), nullable=False),
        sa.Column("ogrnip", sa.String(length=15), nullable=False),
        sa.Column("legal_address", sa.String(length=500), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("inn", name="uq_wholesaler_profiles_inn"),
    )
    op.create_index("ix_wholesaler_profiles_inn", "wholesaler_profiles", ["inn"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_wholesaler_profiles_inn", table_name="wholesaler_profiles")
    op.drop_table("wholesaler_profiles")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
