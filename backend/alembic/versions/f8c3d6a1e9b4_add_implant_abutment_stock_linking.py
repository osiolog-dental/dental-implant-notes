"""add_implant_abutment_stock_linking

Lets an implant or abutment record point at the exact InventoryItem it
consumed, and lets a StockTransaction point back at the record that created
it — so logging an implant can automatically deduct stock, and editing or
deleting that implant can automatically reverse the deduction, without a
separate manual trip to the Stock page.

`implants.inventory_item_id` / `abutments.inventory_item_id` mirror the
existing `implants.surgical_kit_id` pattern exactly (nullable FK to
inventory_items, ON DELETE SET NULL — deleting a stock item must not cascade
into deleting clinical history).

`stock_transactions.source_type` / `source_id` mirror
`financial_line_items.source_type` / `source_id` exactly (nullable, no FK
constraint — same reasoning as that column: it can point at an implant or an
abutment, two different tables, so a single FK isn't possible).

Revision ID: f8c3d6a1e9b4
Revises: e4a9c2b7f1d3
Create Date: 2026-09-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f8c3d6a1e9b4'
down_revision: Union[str, Sequence[str], None] = 'e4a9c2b7f1d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'implants',
        sa.Column('inventory_item_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'fk_implants_inventory_item_id', 'implants', 'inventory_items',
        ['inventory_item_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index('ix_implants_inventory_item_id', 'implants', ['inventory_item_id'])

    op.add_column(
        'abutments',
        sa.Column('inventory_item_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'fk_abutments_inventory_item_id', 'abutments', 'inventory_items',
        ['inventory_item_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index('ix_abutments_inventory_item_id', 'abutments', ['inventory_item_id'])

    op.add_column('stock_transactions', sa.Column('source_type', sa.String(length=50), nullable=True))
    op.add_column('stock_transactions', sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index(
        'ix_stock_transactions_source', 'stock_transactions', ['source_type', 'source_id'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_stock_transactions_source', table_name='stock_transactions')
    op.drop_column('stock_transactions', 'source_id')
    op.drop_column('stock_transactions', 'source_type')

    op.drop_index('ix_abutments_inventory_item_id', table_name='abutments')
    op.drop_constraint('fk_abutments_inventory_item_id', 'abutments', type_='foreignkey')
    op.drop_column('abutments', 'inventory_item_id')

    op.drop_index('ix_implants_inventory_item_id', table_name='implants')
    op.drop_constraint('fk_implants_inventory_item_id', 'implants', type_='foreignkey')
    op.drop_column('implants', 'inventory_item_id')
