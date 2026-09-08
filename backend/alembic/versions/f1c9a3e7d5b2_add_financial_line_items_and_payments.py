"""add_financial_line_items_and_payments

Revision ID: f1c9a3e7d5b2
Revises: e6a1c4f2b8d3
Create Date: 2026-09-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f1c9a3e7d5b2'
down_revision: Union[str, Sequence[str], None] = 'e6a1c4f2b8d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'financial_line_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('cost_amount', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('charged_amount', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('item_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('clinic_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_financial_line_items_patient_id', 'financial_line_items', ['patient_id'])

    op.create_table(
        'patient_payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('method', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_patient_payments_patient_id', 'patient_payments', ['patient_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_patient_payments_patient_id', table_name='patient_payments')
    op.drop_table('patient_payments')
    op.drop_index('ix_financial_line_items_patient_id', table_name='financial_line_items')
    op.drop_table('financial_line_items')
