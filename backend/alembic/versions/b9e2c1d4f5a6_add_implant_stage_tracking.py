"""add_implant_stage_tracking

Revision ID: b9e2c1d4f5a6
Revises: 18444589ace3
Create Date: 2026-04-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b9e2c1d4f5a6'
down_revision: Union[str, Sequence[str], None] = '18444589ace3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('implants', sa.Column('current_stage', sa.Integer(), nullable=True, server_default='1'))
    op.add_column('implants', sa.Column('osseointegration_days', sa.Integer(), nullable=True, server_default='90'))
    op.add_column('implants', sa.Column('stage_2_date', sa.Date(), nullable=True))
    op.add_column('implants', sa.Column('stage_3_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('implants', 'stage_3_date')
    op.drop_column('implants', 'stage_2_date')
    op.drop_column('implants', 'osseointegration_days')
    op.drop_column('implants', 'current_stage')
