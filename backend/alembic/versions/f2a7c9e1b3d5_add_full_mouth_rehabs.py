"""add_full_mouth_rehabs

Revision ID: f2a7c9e1b3d5
Revises: a1b2c3d4e5f6
Create Date: 2026-09-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f2a7c9e1b3d5'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'full_mouth_rehabs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rehab_type', sa.String(length=100), nullable=False, server_default='Upper FMR'),
        sa.Column('connected_implant_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=False, server_default='{}'),
        sa.Column('prosthetic_loading_date', sa.Date(), nullable=True),
        sa.Column('clinical_notes', sa.Text(), nullable=True),
        sa.Column('clinic_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_full_mouth_rehabs_patient_id', 'full_mouth_rehabs', ['patient_id'])


def downgrade() -> None:
    op.drop_index('ix_full_mouth_rehabs_patient_id', table_name='full_mouth_rehabs')
    op.drop_table('full_mouth_rehabs')
