"""add_line_item_source_link

Revision ID: c7b2f4a8e9d1
Revises: a4d8e2c6f1b9
Create Date: 2026-09-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c7b2f4a8e9d1'
down_revision: Union[str, Sequence[str], None] = 'a4d8e2c6f1b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('financial_line_items', sa.Column('source_type', sa.String(length=50), nullable=True))
    op.add_column('financial_line_items', sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index('ix_financial_line_items_source', 'financial_line_items', ['source_type', 'source_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_financial_line_items_source', table_name='financial_line_items')
    op.drop_column('financial_line_items', 'source_id')
    op.drop_column('financial_line_items', 'source_type')
