"""add_abutment_tag_image

Revision ID: d3e5f7a9c2b4
Revises: b7d4e9f2a6c1
Create Date: 2026-09-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd3e5f7a9c2b4'
down_revision: Union[str, Sequence[str], None] = 'b7d4e9f2a6c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('abutments', sa.Column('tag_image', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('abutments', 'tag_image')
