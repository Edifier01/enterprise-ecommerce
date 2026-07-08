"""add product variants, compare-at pricing, and primary category

Revision ID: 005_add_variants_pricing_category
Revises: 004_create_categories_table
Create Date: 2026-07-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_add_variants_pricing_category"
down_revision: Union[str, None] = "004_create_categories_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- products: sale price + primary category association ---
    op.add_column(
        "products",
        sa.Column("compare_at_price_cents", sa.Integer(), nullable=True),
    )
    op.create_check_constraint(
        "ck_products_compare_at_gt_price",
        "products",
        "compare_at_price_cents IS NULL OR compare_at_price_cents > price_cents",
    )
    op.add_column(
        "products",
        sa.Column(
            "category_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("categories.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_products_category_id", "products", ["category_id"])

    # --- product_variants: purchasable SKUs within a product aggregate ---
    op.create_table(
        "product_variants",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "product_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sku", sa.String(64), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "attributes",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'{}'"),
        ),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("in_stock", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
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
        sa.CheckConstraint("price_cents >= 0", name="ck_product_variants_price_non_negative"),
    )
    op.create_index("ix_product_variants_sku", "product_variants", ["sku"], unique=True)
    op.create_index("ix_product_variants_product_id", "product_variants", ["product_id"])
    op.create_index(
        "ix_product_variants_product_sort",
        "product_variants",
        ["product_id", "sort_order"],
    )


def downgrade() -> None:
    op.drop_index("ix_product_variants_product_sort", table_name="product_variants")
    op.drop_index("ix_product_variants_product_id", table_name="product_variants")
    op.drop_index("ix_product_variants_sku", table_name="product_variants")
    op.drop_table("product_variants")

    op.drop_index("ix_products_category_id", table_name="products")
    op.drop_column("products", "category_id")
    op.drop_constraint("ck_products_compare_at_gt_price", "products", type_="check")
    op.drop_column("products", "compare_at_price_cents")
