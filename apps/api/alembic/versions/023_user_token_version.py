"""Add users.token_version for JWT invalidation on password reset."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "023_user_token_version"
down_revision: Union[str, None] = "022_wave_a_guest_email_outbox"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("users", "token_version", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "token_version")
