"""add_kit_usage_threshold

Revision ID: d4f8b2e6c1a9
Revises: c9e1f3a7b5d0
Create Date: 2026-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd4f8b2e6c1a9'
down_revision: Union[str, Sequence[str], None] = 'c9e1f3a7b5d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('inventory_items', sa.Column('usage_threshold', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('inventory_items', 'usage_threshold')
