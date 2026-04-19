"""add_patient_profile_picture

Revision ID: d9e1f3c2a5b7
Revises: c3f7a2b4d1e8
Create Date: 2026-04-19 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd9e1f3c2a5b7'
down_revision: Union[str, Sequence[str], None] = 'c3f7a2b4d1e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('patients', sa.Column('profile_picture', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('patients', 'profile_picture')
