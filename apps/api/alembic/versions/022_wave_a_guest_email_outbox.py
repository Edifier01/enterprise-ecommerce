"""Wave A — guest checkout email + MoySklad export outbox."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "022_wave_a_guest_email_outbox"
down_revision: Union[str, None] = "021_erp_stock_reconciliation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "checkout_sessions",
        sa.Column("guest_email", sa.String(255), nullable=True),
    )

    op.create_table(
        "integration_outbox",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("aggregate_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "event_type",
            "aggregate_id",
            name="uq_integration_outbox_event_aggregate",
        ),
    )
    op.create_index(
        "ix_integration_outbox_pending",
        "integration_outbox",
        ["created_at"],
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_index("ix_integration_outbox_pending", table_name="integration_outbox")
    op.drop_table("integration_outbox")
    op.drop_column("checkout_sessions", "guest_email")
