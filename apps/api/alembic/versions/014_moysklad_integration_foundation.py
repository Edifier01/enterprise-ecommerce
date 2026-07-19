"""moysklad integration foundation (ADR-010)

Revision ID: 014_moysklad_integration
Revises: 013_add_product_content
Create Date: 2026-07-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "014_moysklad_integration"
down_revision: Union[str, None] = "013_add_product_content"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Product overlay fields (ADR-010) ---
    op.add_column(
        "products",
        sa.Column("sync_source", sa.String(length=32), nullable=False, server_default="manual"),
    )
    op.add_column(
        "products",
        sa.Column("moysklad_product_id", sa.String(length=64), nullable=True),
    )
    op.add_column("products", sa.Column("erp_name", sa.String(length=255), nullable=True))
    op.add_column(
        "products",
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("products", sa.Column("meta_title", sa.String(length=255), nullable=True))
    op.add_column("products", sa.Column("meta_description", sa.Text(), nullable=True))
    op.add_column("products", sa.Column("erp_image_url", sa.String(length=2048), nullable=True))

    op.create_check_constraint(
        "ck_products_sync_source",
        "products",
        "sync_source IN ('manual', 'moysklad')",
    )
    op.create_index(
        "ix_products_moysklad_product_id",
        "products",
        ["moysklad_product_id"],
        unique=True,
        postgresql_where=sa.text("moysklad_product_id IS NOT NULL"),
    )

    # --- Variant ERP fields ---
    op.add_column(
        "product_variants",
        sa.Column("moysklad_variant_id", sa.String(length=64), nullable=True),
    )
    op.add_column("product_variants", sa.Column("barcode", sa.String(length=64), nullable=True))
    op.add_column("product_variants", sa.Column("weight_grams", sa.Integer(), nullable=True))
    op.add_column(
        "product_variants",
        sa.Column("dimensions_cm", sa.JSON(), nullable=True),
    )
    op.create_index(
        "ix_product_variants_moysklad_variant_id",
        "product_variants",
        ["moysklad_variant_id"],
        unique=True,
        postgresql_where=sa.text("moysklad_variant_id IS NOT NULL"),
    )

    # --- Site-owned product gallery (8.4) ---
    op.create_table(
        "product_images",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("alt_text", sa.String(length=255), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_product_images_product_id", "product_images", ["product_id"])

    # --- Category ↔ MoySklad folder mapping (8.3) ---
    op.create_table(
        "category_moysklad_mappings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("moysklad_folder_id", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("category_id"),
        sa.UniqueConstraint("moysklad_folder_id"),
    )

    # --- Sync audit log (8.7) ---
    op.create_table(
        "integration_sync_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="moysklad"),
        sa.Column("direction", sa.String(length=16), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("payload_hash", sa.String(length=64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_integration_sync_logs_created_at",
        "integration_sync_logs",
        ["created_at"],
    )
    op.create_index(
        "ix_integration_sync_logs_status_created",
        "integration_sync_logs",
        ["status", "created_at"],
    )

    # --- Global sync state ---
    op.create_table(
        "integration_sync_state",
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("last_full_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_incremental_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("webhooks_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("provider"),
    )

    # --- Order export hook (8.1 — Phase 5) ---
    op.add_column(
        "orders",
        sa.Column("moysklad_order_id", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_orders_moysklad_order_id",
        "orders",
        ["moysklad_order_id"],
        unique=True,
        postgresql_where=sa.text("moysklad_order_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_orders_moysklad_order_id", table_name="orders")
    op.drop_column("orders", "moysklad_order_id")

    op.drop_table("integration_sync_state")
    op.drop_index("ix_integration_sync_logs_status_created", table_name="integration_sync_logs")
    op.drop_index("ix_integration_sync_logs_created_at", table_name="integration_sync_logs")
    op.drop_table("integration_sync_logs")
    op.drop_table("category_moysklad_mappings")
    op.drop_index("ix_product_images_product_id", table_name="product_images")
    op.drop_table("product_images")

    op.drop_index("ix_product_variants_moysklad_variant_id", table_name="product_variants")
    op.drop_column("product_variants", "dimensions_cm")
    op.drop_column("product_variants", "weight_grams")
    op.drop_column("product_variants", "barcode")
    op.drop_column("product_variants", "moysklad_variant_id")

    op.drop_index("ix_products_moysklad_product_id", table_name="products")
    op.drop_constraint("ck_products_sync_source", "products", type_="check")
    op.drop_column("products", "erp_image_url")
    op.drop_column("products", "meta_description")
    op.drop_column("products", "meta_title")
    op.drop_column("products", "last_synced_at")
    op.drop_column("products", "erp_name")
    op.drop_column("products", "moysklad_product_id")
    op.drop_column("products", "sync_source")
