"""add_reminder_emails_enabled

Adds the per-doctor opt-out for the daily reminder email.

Defaults to true so existing doctors start subscribed — the email only goes out
when something is clinically due, so it is not noise, and a doctor who does not
want it can switch it off in Account settings.

Revision ID: e4a9c2b7f1d3
Revises: d7f2a4c8e1b6
Create Date: 2026-09-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e4a9c2b7f1d3'
down_revision: Union[str, Sequence[str], None] = 'd7f2a4c8e1b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # server_default fills existing rows in the same statement, so the column
    # can be NOT NULL immediately without a separate backfill.
    op.add_column(
        'users',
        sa.Column(
            'reminder_emails_enabled',
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'reminder_emails_enabled')
