"""add_finance_view_and_clinic_role

A doctor can own a clinic and also consult at other clinics. Two settings
make that visible in the finances:

- users.finance_view: which side of the finances this doctor wants to see —
  'both' (default), 'clinic' (clinic owner) or 'consultant'. Chosen from the
  selector beside the notification bell; stored on the account so it follows
  the doctor across devices.
- clinics.my_role: the doctor's role at that clinic — 'owner' (default, so
  every existing clinic starts as the doctor's own) or 'consultant'. Cost
  lines at a 'consultant' clinic are the doctor's own consulting income.

Both columns are additive with server defaults, so existing rows are filled
without a table rewrite.

Revision ID: b8e2f4a6c1d3
Revises: a3e7c1b9d2f5
Create Date: 2026-09-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b8e2f4a6c1d3'
down_revision: Union[str, Sequence[str], None] = 'a3e7c1b9d2f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('finance_view', sa.String(length=20), nullable=False, server_default='both'))
    op.add_column('clinics', sa.Column('my_role', sa.String(length=20), nullable=False, server_default='owner'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('clinics', 'my_role')
    op.drop_column('users', 'finance_view')
