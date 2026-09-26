"""add_implant_removed_date

A failed implant goes through two states: failed and still in the bone
(waiting to be removed), then removed. `removed_date` records the second:
NULL on a failed implant = waiting to be removed; a date = removed, site empty.
Only meaningful when implant_outcome = 'Failed'.

Additive and nullable — no backfill. Existing failed implants with no date are
shown as removed only when a newer implant is already logged on that tooth
(decided in the chart, not stored here).

Revision ID: c9f3a5b7d2e4
Revises: b8e2f4a6c1d3
Create Date: 2026-09-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c9f3a5b7d2e4'
down_revision: Union[str, Sequence[str], None] = 'b8e2f4a6c1d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('implants', sa.Column('removed_date', sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('implants', 'removed_date')
