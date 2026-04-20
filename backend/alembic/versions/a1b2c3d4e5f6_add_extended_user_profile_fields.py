"""add_extended_user_profile_fields

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-04-21 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('gender', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('date_of_birth', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('designation', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('organization', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('years_of_experience', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('address_street', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('address_city', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('address_state', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('address_zip', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('primary_clinic', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('consulting_clinics', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('clinical_focus', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('education', JSONB(), nullable=True))
    op.add_column('users', sa.Column('publications', JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'publications')
    op.drop_column('users', 'education')
    op.drop_column('users', 'clinical_focus')
    op.drop_column('users', 'consulting_clinics')
    op.drop_column('users', 'primary_clinic')
    op.drop_column('users', 'address_zip')
    op.drop_column('users', 'address_state')
    op.drop_column('users', 'address_city')
    op.drop_column('users', 'address_street')
    op.drop_column('users', 'years_of_experience')
    op.drop_column('users', 'organization')
    op.drop_column('users', 'designation')
    op.drop_column('users', 'date_of_birth')
    op.drop_column('users', 'gender')
