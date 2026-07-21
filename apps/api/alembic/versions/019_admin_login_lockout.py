"""admin login lockout fields

Revision ID: 019_admin_login_lockout
Revises: 018_remove_admin_mfa
Create Date: 2026-07-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "019_admin_login_lockout"
down_revision: Union[str, None] = "018_remove_admin_mfa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "admin_users",
        sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "admin_users",
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("admin_users", "locked_until")
    op.drop_column("admin_users", "failed_login_attempts")
