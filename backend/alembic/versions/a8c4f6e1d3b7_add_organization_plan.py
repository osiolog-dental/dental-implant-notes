"""add_organization_plan

Revision ID: a8c4f6e1d3b7
Revises: f3a9d5e2c8b6
Create Date: 2026-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a8c4f6e1d3b7'
down_revision: Union[str, Sequence[str], None] = 'f3a9d5e2c8b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('organizations', sa.Column('plan', sa.String(length=20), nullable=False, server_default='free'))
    op.add_column('organizations', sa.Column('plan_updated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('organizations', sa.Column('plan_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('organizations', 'plan_notes')
    op.drop_column('organizations', 'plan_updated_at')
    op.drop_column('organizations', 'plan')
