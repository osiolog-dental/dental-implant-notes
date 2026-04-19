"""add_abutments_overdentures_extra_fields

Revision ID: c3f7a2b4d1e8
Revises: 0be69855ee94
Create Date: 2026-04-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c3f7a2b4d1e8'
down_revision: Union[str, Sequence[str], None] = '68a72b78a891'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── abutments table ──────────────────────────────────────────────────────
    op.create_table(
        'abutments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tooth_number', sa.Integer(), nullable=True),
        sa.Column('abutment_type', sa.String(255), nullable=False, server_default='Stock Abutment Straight'),
        sa.Column('connected_implant_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
                  nullable=False, server_default='{}'),
        sa.Column('placement_date', sa.Date(), nullable=True),
        sa.Column('clinical_notes', sa.Text(), nullable=True),
        sa.Column('clinic_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_abutments_patient_id', 'abutments', ['patient_id'])

    # ── overdentures table ───────────────────────────────────────────────────
    op.create_table(
        'overdentures',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tooth_numbers', postgresql.ARRAY(sa.Integer()), nullable=False, server_default='{}'),
        sa.Column('attachment_type', sa.String(255), nullable=False, server_default='Ball Attachment'),
        sa.Column('connected_implant_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
                  nullable=False, server_default='{}'),
        sa.Column('has_bar', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('bar_material', sa.String(255), nullable=True),
        sa.Column('prosthetic_loading_date', sa.Date(), nullable=True),
        sa.Column('clinical_notes', sa.Text(), nullable=True),
        sa.Column('clinic_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_overdentures_patient_id', 'overdentures', ['patient_id'])

    # ── implants: new columns ────────────────────────────────────────────────
    op.alter_column('implants', 'case_id', nullable=True)
    op.add_column('implants', sa.Column('diameter_mm', sa.Numeric(6, 2), nullable=True))
    op.add_column('implants', sa.Column('length_mm', sa.Numeric(6, 2), nullable=True))
    op.add_column('implants', sa.Column('consultant_surgeon', sa.String(255), nullable=True))
    op.add_column('implants', sa.Column('clinical_notes', sa.Text(), nullable=True))
    op.add_column('implants', sa.Column('tag_image', sa.Text(), nullable=True))
    op.add_column('implants', sa.Column('clinic_id', sa.String(255), nullable=True))

    # ── prosthetic_fpd: make case_id nullable + new columns ─────────────────
    op.alter_column('prosthetic_fpd', 'case_id', nullable=True)
    op.add_column('prosthetic_fpd', sa.Column('crown_material', sa.String(255), nullable=True))
    op.add_column('prosthetic_fpd', sa.Column('consultant_prosthodontist', sa.String(255), nullable=True))
    op.add_column('prosthetic_fpd', sa.Column('lab_name', sa.String(255), nullable=True))
    op.add_column('prosthetic_fpd', sa.Column('warranty_image_url', sa.Text(), nullable=True))

    # ── patients: new optional contact fields ────────────────────────────────
    op.add_column('patients', sa.Column('alternate_email', sa.String(255), nullable=True))
    op.add_column('patients', sa.Column('emergency_phone', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column('patients', 'emergency_phone')
    op.drop_column('patients', 'alternate_email')

    op.drop_column('prosthetic_fpd', 'warranty_image_url')
    op.drop_column('prosthetic_fpd', 'lab_name')
    op.drop_column('prosthetic_fpd', 'consultant_prosthodontist')
    op.drop_column('prosthetic_fpd', 'crown_material')

    op.drop_column('implants', 'clinic_id')
    op.drop_column('implants', 'tag_image')
    op.drop_column('implants', 'clinical_notes')
    op.drop_column('implants', 'consultant_surgeon')
    op.drop_column('implants', 'length_mm')
    op.drop_column('implants', 'diameter_mm')

    op.drop_index('ix_overdentures_patient_id', table_name='overdentures')
    op.drop_table('overdentures')
    op.drop_index('ix_abutments_patient_id', table_name='abutments')
    op.drop_table('abutments')
