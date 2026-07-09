"""add checkout, payments, and orders tables

Revision ID: 006_add_checkout_payments_orders
Revises: 005_add_variants_pricing_category
Create Date: 2026-07-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_add_checkout_payments_orders"
down_revision: Union[str, None] = "005_add_variants_pricing_category"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "carts",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("session_token", sa.String(64), nullable=True),
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "session_token IS NOT NULL OR user_id IS NOT NULL",
            name="ck_carts_has_owner",
        ),
    )
    op.create_index("ix_carts_session_token", "carts", ["session_token"], unique=True)
    op.create_index("ix_carts_user_id", "carts", ["user_id"])
    op.create_index("ix_carts_status", "carts", ["status"])

    op.create_table(
        "cart_lines",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "cart_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("carts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "variant_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("product_variants.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("product_snapshot", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("quantity > 0", name="ck_cart_lines_quantity_positive"),
        sa.CheckConstraint("unit_price_cents >= 0", name="ck_cart_lines_price_non_negative"),
        sa.UniqueConstraint("cart_id", "variant_id", name="uq_cart_lines_cart_variant"),
    )
    op.create_index("ix_cart_lines_cart_id", "cart_lines", ["cart_id"])
    op.create_index("ix_cart_lines_variant_id", "cart_lines", ["variant_id"])

    op.create_table(
        "checkout_sessions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "cart_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("carts.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("subtotal_cents", sa.Integer(), nullable=False),
        sa.Column("total_cents", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(255), nullable=True),
        sa.Column("stripe_payment_intent_id", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_checkout_sessions_cart_id", "checkout_sessions", ["cart_id"])
    op.create_index("ix_checkout_sessions_user_id", "checkout_sessions", ["user_id"])
    op.create_index("ix_checkout_sessions_status", "checkout_sessions", ["status"])
    op.create_index(
        "ix_checkout_sessions_idempotency_key",
        "checkout_sessions",
        ["idempotency_key"],
        unique=True,
    )
    op.create_index(
        "ix_checkout_sessions_stripe_pi",
        "checkout_sessions",
        ["stripe_payment_intent_id"],
        unique=True,
    )

    op.create_table(
        "checkout_session_lines",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "checkout_session_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("checkout_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "variant_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("product_variants.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("product_snapshot", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "quantity > 0",
            name="ck_checkout_session_lines_quantity_positive",
        ),
        sa.CheckConstraint(
            "unit_price_cents >= 0",
            name="ck_checkout_session_lines_price_non_negative",
        ),
        sa.UniqueConstraint(
            "checkout_session_id",
            "variant_id",
            name="uq_checkout_session_lines_session_variant",
        ),
    )
    op.create_index(
        "ix_checkout_session_lines_checkout_session_id",
        "checkout_session_lines",
        ["checkout_session_id"],
    )
    op.create_index(
        "ix_checkout_session_lines_variant_id",
        "checkout_session_lines",
        ["variant_id"],
    )

    op.create_table(
        "payment_records",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "checkout_session_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("checkout_sessions.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("stripe_payment_intent_id", sa.String(255), nullable=False),
        sa.Column("stripe_charge_id", sa.String(255), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("idempotency_key", sa.String(255), nullable=False),
        sa.Column("failure_code", sa.String(64), nullable=True),
        sa.Column("failure_message", sa.Text(), nullable=True),
        sa.Column("payment_method_summary", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_payment_records_checkout_session_id",
        "payment_records",
        ["checkout_session_id"],
    )
    op.create_index("ix_payment_records_status", "payment_records", ["status"])
    op.create_index(
        "ix_payment_records_stripe_pi",
        "payment_records",
        ["stripe_payment_intent_id"],
        unique=True,
    )
    op.create_index(
        "ix_payment_records_idempotency_key",
        "payment_records",
        ["idempotency_key"],
        unique=True,
    )

    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("stripe_event_id", sa.String(255), nullable=False),
        sa.Column("event_type", sa.String(128), nullable=False),
        sa.Column(
            "processed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_stripe_webhook_events_stripe_event_id",
        "stripe_webhook_events",
        ["stripe_event_id"],
        unique=True,
    )

    op.create_table(
        "orders",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("order_number", sa.String(32), nullable=False),
        sa.Column(
            "checkout_session_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("checkout_sessions.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "customer_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("guest_email", sa.String(255), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="confirmed"),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("subtotal_cents", sa.Integer(), nullable=False),
        sa.Column("discount_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("shipping_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tax_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_cents", sa.Integer(), nullable=False),
        sa.Column(
            "payment_record_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("payment_records.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_orders_order_number", "orders", ["order_number"], unique=True)
    op.create_index(
        "ix_orders_checkout_session_id",
        "orders",
        ["checkout_session_id"],
        unique=True,
    )
    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])
    op.create_index("ix_orders_status", "orders", ["status"])

    op.add_column(
        "payment_records",
        sa.Column("order_id", sa.Uuid(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_payment_records_order_id",
        "payment_records",
        "orders",
        ["order_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_payment_records_order_id", "payment_records", ["order_id"])

    op.create_table(
        "order_lines",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("orders.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "variant_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("product_variants.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("line_total_cents", sa.Integer(), nullable=False),
        sa.Column("product_snapshot", sa.JSON(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_order_lines_quantity_positive"),
        sa.CheckConstraint("unit_price_cents >= 0", name="ck_order_lines_price_non_negative"),
        sa.CheckConstraint("line_total_cents >= 0", name="ck_order_lines_total_non_negative"),
    )
    op.create_index("ix_order_lines_order_id", "order_lines", ["order_id"])
    op.create_index("ix_order_lines_variant_id", "order_lines", ["variant_id"])

    op.create_table(
        "order_status_history",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("orders.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("from_status", sa.String(32), nullable=True),
        sa.Column("to_status", sa.String(32), nullable=False),
        sa.Column("changed_by", sa.String(64), nullable=False, server_default="system"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_order_status_history_order_id", "order_status_history", ["order_id"])


def downgrade() -> None:
    op.drop_index("ix_order_status_history_order_id", table_name="order_status_history")
    op.drop_table("order_status_history")

    op.drop_index("ix_order_lines_variant_id", table_name="order_lines")
    op.drop_index("ix_order_lines_order_id", table_name="order_lines")
    op.drop_table("order_lines")

    op.drop_index("ix_payment_records_order_id", table_name="payment_records")
    op.drop_constraint("fk_payment_records_order_id", "payment_records", type_="foreignkey")
    op.drop_column("payment_records", "order_id")

    op.drop_index("ix_orders_status", table_name="orders")
    op.drop_index("ix_orders_customer_id", table_name="orders")
    op.drop_index("ix_orders_checkout_session_id", table_name="orders")
    op.drop_index("ix_orders_order_number", table_name="orders")
    op.drop_table("orders")

    op.drop_index("ix_stripe_webhook_events_stripe_event_id", table_name="stripe_webhook_events")
    op.drop_table("stripe_webhook_events")

    op.drop_index("ix_payment_records_idempotency_key", table_name="payment_records")
    op.drop_index("ix_payment_records_stripe_pi", table_name="payment_records")
    op.drop_index("ix_payment_records_status", table_name="payment_records")
    op.drop_index("ix_payment_records_checkout_session_id", table_name="payment_records")
    op.drop_table("payment_records")

    op.drop_index("ix_checkout_session_lines_variant_id", table_name="checkout_session_lines")
    op.drop_index(
        "ix_checkout_session_lines_checkout_session_id",
        table_name="checkout_session_lines",
    )
    op.drop_table("checkout_session_lines")

    op.drop_index("ix_checkout_sessions_stripe_pi", table_name="checkout_sessions")
    op.drop_index("ix_checkout_sessions_idempotency_key", table_name="checkout_sessions")
    op.drop_index("ix_checkout_sessions_status", table_name="checkout_sessions")
    op.drop_index("ix_checkout_sessions_user_id", table_name="checkout_sessions")
    op.drop_index("ix_checkout_sessions_cart_id", table_name="checkout_sessions")
    op.drop_table("checkout_sessions")

    op.drop_index("ix_cart_lines_variant_id", table_name="cart_lines")
    op.drop_index("ix_cart_lines_cart_id", table_name="cart_lines")
    op.drop_table("cart_lines")

    op.drop_index("ix_carts_status", table_name="carts")
    op.drop_index("ix_carts_user_id", table_name="carts")
    op.drop_index("ix_carts_session_token", table_name="carts")
    op.drop_table("carts")
