"""add_surgical_kit_to_implants

Revision ID: e6a2c8f1b4d7
Revises: d4f8b2e6c1a9
Create Date: 2026-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e6a2c8f1b4d7'
down_revision: Union[str, Sequence[str], None] = 'd4f8b2e6c1a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'implants',
        sa.Column('surgical_kit_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('inventory_items.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index('ix_implants_surgical_kit_id', 'implants', ['surgical_kit_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_implants_surgical_kit_id', table_name='implants')
    op.drop_column('implants', 'surgical_kit_id')
