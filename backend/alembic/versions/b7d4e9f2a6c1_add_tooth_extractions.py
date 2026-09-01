"""add_tooth_extractions

Revision ID: b7d4e9f2a6c1
Revises: f2a7c9e1b3d5
Create Date: 2026-09-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b7d4e9f2a6c1'
down_revision: Union[str, Sequence[str], None] = 'f2a7c9e1b3d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tooth_extractions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tooth_numbers', postgresql.ARRAY(sa.Integer()), nullable=False, server_default='{}'),
        sa.Column('extraction_date', sa.Date(), nullable=False),
        sa.Column('bone_graft', sa.String(length=255), nullable=True),
        sa.Column('membrane_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('planned_future_implant', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('reminder_days', sa.Integer(), nullable=True),
        sa.Column('clinic_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('clinical_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_tooth_extractions_patient_id', 'tooth_extractions', ['patient_id'])


def downgrade() -> None:
    op.drop_index('ix_tooth_extractions_patient_id', table_name='tooth_extractions')
    op.drop_table('tooth_extractions')
