"""add_contact_messages

Revision ID: d8e3f6a2c4b7
Revises: c7b2f4a8e9d1
Create Date: 2026-09-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd8e3f6a2c4b7'
down_revision: Union[str, Sequence[str], None] = 'c7b2f4a8e9d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'contact_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('email_sent', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('contact_messages')
