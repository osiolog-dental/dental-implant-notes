"""add_inventory_and_stock

Revision ID: a3f7c1e9b2d4
Revises: d8e3f6a2c4b7
Create Date: 2026-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a3f7c1e9b2d4'
down_revision: Union[str, Sequence[str], None] = 'd8e3f6a2c4b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'inventory_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category', sa.String(length=30), nullable=False, server_default='implant'),
        sa.Column('brand', sa.String(length=255), nullable=True),
        sa.Column('implant_system', sa.String(length=255), nullable=True),
        sa.Column('diameter_mm', sa.Numeric(6, 2), nullable=True),
        sa.Column('length_mm', sa.Numeric(6, 2), nullable=True),
        sa.Column('abutment_type', sa.String(length=255), nullable=True),
        sa.Column('size_label', sa.String(length=255), nullable=True),
        sa.Column('article_no', sa.String(length=100), nullable=True),
        sa.Column('low_stock_threshold', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('clinic_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_inventory_items_org_id', 'inventory_items', ['org_id'])

    op.create_table(
        'stock_purchases',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('purchase_date', sa.Date(), nullable=False),
        sa.Column('supplier_name', sa.String(length=255), nullable=True),
        sa.Column('order_ref', sa.String(length=100), nullable=True),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('bill_image_url', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_stock_purchases_org_id', 'stock_purchases', ['org_id'])

    op.create_table(
        'stock_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('inventory_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('inventory_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('transaction_type', sa.String(length=10), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_cost', sa.Numeric(10, 2), nullable=True),
        sa.Column('purchase_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('stock_purchases.id', ondelete='CASCADE'), nullable=True),
        sa.Column('line_net_cost', sa.Numeric(10, 2), nullable=True),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('patients.id', ondelete='SET NULL'), nullable=True),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_stock_transactions_inventory_item_id', 'stock_transactions', ['inventory_item_id'])
    op.create_index('ix_stock_transactions_purchase_id', 'stock_transactions', ['purchase_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_stock_transactions_purchase_id', table_name='stock_transactions')
    op.drop_index('ix_stock_transactions_inventory_item_id', table_name='stock_transactions')
    op.drop_table('stock_transactions')
    op.drop_index('ix_stock_purchases_org_id', table_name='stock_purchases')
    op.drop_table('stock_purchases')
    op.drop_index('ix_inventory_items_org_id', table_name='inventory_items')
    op.drop_table('inventory_items')
