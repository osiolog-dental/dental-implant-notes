"""add_organization_extra_clinics

Revision ID: c3e7a1f5b9d4
Revises: b1d5f9e3a7c2
Create Date: 2026-09-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c3e7a1f5b9d4'
down_revision: Union[str, Sequence[str], None] = 'b1d5f9e3a7c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('organizations', sa.Column('extra_clinics', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('organizations', 'extra_clinics')
