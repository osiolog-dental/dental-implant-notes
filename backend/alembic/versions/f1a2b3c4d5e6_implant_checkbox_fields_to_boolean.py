"""implant_checkbox_fields_to_boolean

Revision ID: f1a2b3c4d5e6
Revises: e7f2a1c4b8d9
Create Date: 2026-04-20 01:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e7f2a1c4b8d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for col in ('cover_screw', 'healing_abutment', 'membrane_used'):
        op.alter_column(
            'implants', col,
            existing_type=sa.String(255),
            type_=sa.Boolean(),
            existing_nullable=True,
            postgresql_using=f"CASE WHEN {col} IN ('true','True','1','yes') THEN TRUE WHEN {col} IS NULL THEN NULL ELSE FALSE END",
        )


def downgrade() -> None:
    for col in ('cover_screw', 'healing_abutment', 'membrane_used'):
        op.alter_column(
            'implants', col,
            existing_type=sa.Boolean(),
            type_=sa.String(255),
            existing_nullable=True,
            postgresql_using=f"{col}::text",
        )
