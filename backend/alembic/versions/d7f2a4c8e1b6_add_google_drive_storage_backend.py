"""add_google_drive_storage_backend

Revision ID: d7f2a4c8e1b6
Revises: c3e7a1f5b9d4
Create Date: 2026-09-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd7f2a4c8e1b6'
down_revision: Union[str, Sequence[str], None] = 'c3e7a1f5b9d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('organizations', sa.Column('storage_backend', sa.String(length=20), nullable=False, server_default='platform'))

    op.add_column('case_images', sa.Column('storage_backend', sa.String(length=20), nullable=False, server_default='platform'))
    op.alter_column('case_images', 's3_key', existing_type=sa.Text(), nullable=True)
    op.add_column('case_images', sa.Column('drive_file_id', sa.String(length=255), nullable=True))
    op.add_column('case_images', sa.Column('thumbnail_drive_file_id', sa.String(length=255), nullable=True))

    op.add_column('case_images', sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.execute(
        """
        UPDATE case_images
        SET org_id = patients.org_id
        FROM cases
        JOIN patients ON patients.id = cases.patient_id
        WHERE cases.id = case_images.case_id
        """
    )
    op.alter_column('case_images', 'org_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.create_foreign_key(
        'fk_case_images_org_id', 'case_images', 'organizations', ['org_id'], ['id'], ondelete='CASCADE'
    )

    op.create_table(
        'google_drive_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('access_token', sa.Text(), nullable=False),
        sa.Column('refresh_token', sa.Text(), nullable=False),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('folder_id', sa.String(length=255), nullable=False),
        sa.Column('connected_email', sa.String(length=255), nullable=True),
        sa.Column('connected_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('google_drive_connections')
    op.drop_constraint('fk_case_images_org_id', 'case_images', type_='foreignkey')
    op.drop_column('case_images', 'org_id')
    op.drop_column('case_images', 'thumbnail_drive_file_id')
    op.drop_column('case_images', 'drive_file_id')
    op.alter_column('case_images', 's3_key', existing_type=sa.Text(), nullable=False)
    op.drop_column('case_images', 'storage_backend')
    op.drop_column('organizations', 'storage_backend')
