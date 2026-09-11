"""add_catalogue_references

Revision ID: b7d2e4f9a1c3
Revises: a3f7c1e9b2d4
Create Date: 2026-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b7d2e4f9a1c3'
down_revision: Union[str, Sequence[str], None] = 'a3f7c1e9b2d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'catalogue_references',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('article_no', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=30), nullable=False, server_default='implant'),
        sa.Column('brand', sa.String(length=255), nullable=True),
        sa.Column('implant_system', sa.String(length=255), nullable=True),
        sa.Column('diameter_mm', sa.Numeric(6, 2), nullable=True),
        sa.Column('length_mm', sa.Numeric(6, 2), nullable=True),
        sa.Column('abutment_type', sa.String(length=255), nullable=True),
        sa.Column('size_label', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('org_id', 'article_no', name='uq_catalogue_reference_org_article'),
    )
    op.create_index('ix_catalogue_references_org_id', 'catalogue_references', ['org_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_catalogue_references_org_id', table_name='catalogue_references')
    op.drop_table('catalogue_references')
