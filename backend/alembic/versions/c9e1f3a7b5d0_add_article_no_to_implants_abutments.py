"""add_article_no_to_implants_abutments

Revision ID: c9e1f3a7b5d0
Revises: b7d2e4f9a1c3
Create Date: 2026-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c9e1f3a7b5d0'
down_revision: Union[str, Sequence[str], None] = 'b7d2e4f9a1c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('implants', sa.Column('article_no', sa.String(length=100), nullable=True))
    op.add_column('abutments', sa.Column('brand', sa.String(length=255), nullable=True))
    op.add_column('abutments', sa.Column('size_label', sa.String(length=255), nullable=True))
    op.add_column('abutments', sa.Column('article_no', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('abutments', 'article_no')
    op.drop_column('abutments', 'size_label')
    op.drop_column('abutments', 'brand')
    op.drop_column('implants', 'article_no')
