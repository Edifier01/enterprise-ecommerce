"""admin MFA fields

Revision ID: 017_admin_mfa
Revises: 016_order_shipping_details
Create Date: 2026-07-20

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "017_admin_mfa"
down_revision: Union[str, None] = "016_order_shipping_details"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "admin_users",
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "admin_users",
        sa.Column("totp_secret_encrypted", sa.String(512), nullable=True),
    )
    op.add_column(
        "admin_users",
        sa.Column("mfa_backup_codes_hash", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("admin_users", "mfa_backup_codes_hash")
    op.drop_column("admin_users", "totp_secret_encrypted")
    op.drop_column("admin_users", "mfa_enabled")
