"""fpd_crown_count_varchar

Revision ID: e7f2a1c4b8d9
Revises: b9e2c1d4f5a6
Create Date: 2026-04-20 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e7f2a1c4b8d9'
down_revision: Union[str, Sequence[str], None] = 'b9e2c1d4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'prosthetic_fpd', 'crown_count',
        existing_type=sa.Integer(),
        type_=sa.String(100),
        existing_nullable=True,
        postgresql_using='crown_count::text',
    )


def downgrade() -> None:
    op.alter_column(
        'prosthetic_fpd', 'crown_count',
        existing_type=sa.String(100),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using="CASE WHEN crown_count ~ '^[0-9]+$' THEN crown_count::integer ELSE NULL END",
    )
