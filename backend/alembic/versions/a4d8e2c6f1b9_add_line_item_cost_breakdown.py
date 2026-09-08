"""add_line_item_cost_breakdown

Revision ID: a4d8e2c6f1b9
Revises: f1c9a3e7d5b2
Create Date: 2026-09-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a4d8e2c6f1b9'
down_revision: Union[str, Sequence[str], None] = 'f1c9a3e7d5b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('financial_line_items', sa.Column('provider_type', sa.String(length=20), nullable=False, server_default='clinic'))
    op.add_column('financial_line_items', sa.Column('consultant_charge', sa.Numeric(10, 2), nullable=False, server_default='0'))
    op.add_column('financial_line_items', sa.Column('material_cost', sa.Numeric(10, 2), nullable=False, server_default='0'))
    op.add_column('financial_line_items', sa.Column('other_expenses', sa.Numeric(10, 2), nullable=False, server_default='0'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('financial_line_items', 'other_expenses')
    op.drop_column('financial_line_items', 'material_cost')
    op.drop_column('financial_line_items', 'consultant_charge')
    op.drop_column('financial_line_items', 'provider_type')
