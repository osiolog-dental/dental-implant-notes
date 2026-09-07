"""add_implant_follow_ups

Revision ID: e6a1c4f2b8d3
Revises: d3e5f7a9c2b4
Create Date: 2026-09-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e6a1c4f2b8d3'
down_revision: Union[str, Sequence[str], None] = 'd3e5f7a9c2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'implant_follow_ups',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('implant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('implants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('follow_up_date', sa.Date(), nullable=False),
        sa.Column('osseointegration_success', sa.Boolean(), nullable=True),
        sa.Column('peri_implant_health', sa.String(length=100), nullable=True),
        sa.Column('prognosis', sa.String(length=20), nullable=False, server_default='Good'),
        sa.Column('clinical_notes', sa.Text(), nullable=True),
        sa.Column('clinic_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_implant_follow_ups_patient_id', 'implant_follow_ups', ['patient_id'])
    op.create_index('ix_implant_follow_ups_implant_id', 'implant_follow_ups', ['implant_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_implant_follow_ups_implant_id', table_name='implant_follow_ups')
    op.drop_index('ix_implant_follow_ups_patient_id', table_name='implant_follow_ups')
    op.drop_table('implant_follow_ups')
