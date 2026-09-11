"""add_clinic_contact_and_gmaps_fields

Revision ID: f3a9d5e2c8b6
Revises: e6a2c8f1b4d7
Create Date: 2026-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f3a9d5e2c8b6'
down_revision: Union[str, Sequence[str], None] = 'e6a2c8f1b4d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('clinics', sa.Column('phone', sa.String(length=50), nullable=True))
    op.add_column('clinics', sa.Column('alternate_phone', sa.String(length=50), nullable=True))
    op.add_column('clinics', sa.Column('email', sa.String(length=255), nullable=True))
    op.add_column('clinics', sa.Column('gmaps_link', sa.Text(), nullable=True))
    op.add_column('clinics', sa.Column('latitude', sa.Numeric(10, 7), nullable=True))
    op.add_column('clinics', sa.Column('longitude', sa.Numeric(10, 7), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('clinics', 'longitude')
    op.drop_column('clinics', 'latitude')
    op.drop_column('clinics', 'gmaps_link')
    op.drop_column('clinics', 'email')
    op.drop_column('clinics', 'alternate_phone')
    op.drop_column('clinics', 'phone')
