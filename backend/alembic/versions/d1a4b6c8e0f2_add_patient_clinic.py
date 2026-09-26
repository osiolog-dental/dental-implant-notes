"""add_patient_clinic

Each patient can belong to one clinic (patients.clinic_id). The clinic's
`my_role` then decides which side of the patient's finances the doctor sees:
their own clinic → clinic side; a clinic they consult at → consultant side.

Backfill (user's choice, 2026-09-26): an existing patient whose implants were
all logged at one clinic of the same practice gets that clinic. Implants with
no clinic, or with a clinic_id that isn't one of the practice's clinics
(implants.clinic_id is a free string column), are ignored. Patients whose
implants span two or more clinics are left blank for the doctor to choose.

Revision ID: d1a4b6c8e0f2
Revises: c9f3a5b7d2e4
Create Date: 2026-09-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd1a4b6c8e0f2'
down_revision: Union[str, Sequence[str], None] = 'c9f3a5b7d2e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('patients', sa.Column('clinic_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_patients_clinic_id', 'patients', 'clinics', ['clinic_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index('ix_patients_clinic_id', 'patients', ['clinic_id'])
    op.execute("""
        UPDATE patients p
        SET clinic_id = sub.cid::uuid
        FROM (
            SELECT i.patient_id, MIN(i.clinic_id) AS cid
            FROM implants i
            JOIN patients pp ON pp.id = i.patient_id
            JOIN clinics c ON c.id::text = i.clinic_id AND c.org_id = pp.org_id
            GROUP BY i.patient_id
            HAVING COUNT(DISTINCT i.clinic_id) = 1
        ) sub
        WHERE p.id = sub.patient_id AND p.clinic_id IS NULL
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_patients_clinic_id', table_name='patients')
    op.drop_constraint('fk_patients_clinic_id', 'patients', type_='foreignkey')
    op.drop_column('patients', 'clinic_id')
