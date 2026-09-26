"""add_referral_tracking

Lets a doctor share a personal link that credits their organization when a
colleague signs up through it, and lets the reward (extra storage) be
approved from the Admin panel rather than applied automatically — an
organization is only ever rewarded once someone at the company has looked
at the referral.

`referral_code` is nullable and generated lazily (first time a doctor opens
the "Refer a Colleague" panel), not backfilled here, so this migration adds
no risk of a uniqueness collision across existing rows.

Revision ID: a3e7c1b9d2f5
Revises: f8c3d6a1e9b4
Create Date: 2026-09-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a3e7c1b9d2f5'
down_revision: Union[str, Sequence[str], None] = 'f8c3d6a1e9b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('organizations', sa.Column('referral_code', sa.String(length=16), nullable=True))
    op.create_unique_constraint('uq_organizations_referral_code', 'organizations', ['referral_code'])

    op.add_column('organizations', sa.Column('referred_by_org_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_organizations_referred_by_org_id', 'organizations', 'organizations',
        ['referred_by_org_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index('ix_organizations_referred_by_org_id', 'organizations', ['referred_by_org_id'])

    # 'none' | 'pending' | 'approved' | 'rejected' — only meaningful when
    # referred_by_org_id is set. Indexed since Admin's pending-review list
    # filters on it directly.
    op.add_column(
        'organizations',
        sa.Column('referral_reward_status', sa.String(length=20), nullable=False, server_default='none'),
    )
    op.create_index('ix_organizations_referral_reward_status', 'organizations', ['referral_reward_status'])

    # Added on top of the plan's base storage_mb — see app.core.plans.
    op.add_column(
        'organizations',
        sa.Column('storage_bonus_mb', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('organizations', 'storage_bonus_mb')
    op.drop_index('ix_organizations_referral_reward_status', table_name='organizations')
    op.drop_column('organizations', 'referral_reward_status')
    op.drop_index('ix_organizations_referred_by_org_id', table_name='organizations')
    op.drop_constraint('fk_organizations_referred_by_org_id', 'organizations', type_='foreignkey')
    op.drop_column('organizations', 'referred_by_org_id')
    op.drop_constraint('uq_organizations_referral_code', 'organizations', type_='unique')
    op.drop_column('organizations', 'referral_code')
