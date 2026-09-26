"""
Which side of the finances each cost line belongs to.

A doctor can own a clinic and also consult at other clinics — two separate
businesses in one account. Every cost line is sorted into one side:

- 'consultant' — the doctor's OWN consulting work: the line is at a clinic
  they've marked `my_role = 'consultant'`. `consultant_charge` is the fee the
  clinic pays them; material/other costs come out of that fee.
- 'owner'      — the doctor's own clinic's business. At an owner clinic a
  'consultant' line still means a VISITING consultant they paid.

The line's clinic is its own `clinic_id` if set, otherwise the clinic of the
implant / abutment it's linked to. A line with no clinic at all (older
entries, crowns, lab bills, other) falls back to its label: provider_type
'consultant' → 'consultant' side, anything else → 'owner'. (User decision,
2026-09-26 — see docs/DECISIONS.md D-019.)

The same rule feeds the patient page (via `finance_side` on each line item)
and the Analytics summary, so the two can never disagree.
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.abutment import Abutment
from app.models.clinic import Clinic
from app.models.financial import FinancialLineItem, PatientPayment
from app.models.implant import Implant
from app.models.patient import Patient


@dataclass
class Resolved:
    clinic_id: str | None
    side: str  # 'owner' | 'consultant'


def _as_str(v) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


async def resolve_sides(
    db: AsyncSession, org_id: uuid.UUID, items: list[FinancialLineItem]
) -> dict[uuid.UUID, Resolved]:
    """Clinic + side for each line item. Queries are scoped to the org."""
    clinics = (await db.execute(select(Clinic).where(Clinic.org_id == org_id))).scalars().all()
    role_by_clinic = {str(c.id): (c.my_role or 'owner') for c in clinics}

    implant_ids = [i.source_id for i in items if i.source_type == 'implant' and i.source_id]
    abutment_ids = [i.source_id for i in items if i.source_type == 'abutment' and i.source_id]
    implant_clinic: dict[str, str | None] = {}
    abutment_clinic: dict[str, str | None] = {}
    if implant_ids:
        rows = await db.execute(
            select(Implant.id, Implant.clinic_id)
            .join(Patient, Implant.patient_id == Patient.id)
            .where(Implant.id.in_(implant_ids), Patient.org_id == org_id)
        )
        implant_clinic = {str(r[0]): _as_str(r[1]) for r in rows.all()}
    if abutment_ids:
        rows = await db.execute(
            select(Abutment.id, Abutment.clinic_id)
            .join(Patient, Abutment.patient_id == Patient.id)
            .where(Abutment.id.in_(abutment_ids), Patient.org_id == org_id)
        )
        abutment_clinic = {str(r[0]): _as_str(r[1]) for r in rows.all()}

    out: dict[uuid.UUID, Resolved] = {}
    for it in items:
        clinic = _as_str(it.clinic_id)
        if not clinic and it.source_id:
            if it.source_type == 'implant':
                clinic = implant_clinic.get(str(it.source_id))
            elif it.source_type == 'abutment':
                clinic = abutment_clinic.get(str(it.source_id))
        if clinic and clinic not in role_by_clinic:
            clinic = None  # stale / foreign id — treat as "no clinic"
        if clinic:
            side = 'consultant' if role_by_clinic[clinic] == 'consultant' else 'owner'
        else:
            side = 'consultant' if it.provider_type == 'consultant' else 'owner'
        out[it.id] = Resolved(clinic_id=clinic, side=side)
    return out


def _in_period(d: date | None, period: str, today: date) -> bool:
    if period == 'all':
        return True
    if d is None:
        return False  # undated lines count only in "All time"
    if period == 'year':
        return d.year == today.year
    return d.year == today.year and d.month == today.month  # 'month'


def _n(v) -> float:
    return float(v or 0)


async def finance_summary(db: AsyncSession, org_id: uuid.UUID, period: str, today: date) -> dict:
    """
    Practice-wide totals using exactly the patient Financials formulas:
      owner side   — charged, clinic cost (visiting consultant fee, or the line's
                     own cost), paid (patient payments), balance, profit = paid − cost
      consultant   — fees received, own material/other costs, profit = fees − costs
    Patient payments aren't linked to a clinic, so they count on the owner side
    only and aren't split per clinic.
    """
    items = list((await db.execute(
        select(FinancialLineItem)
        .join(Patient, FinancialLineItem.patient_id == Patient.id)
        .where(Patient.org_id == org_id, Patient.deleted_at.is_(None))
    )).scalars().all())
    payments = list((await db.execute(
        select(PatientPayment)
        .join(Patient, PatientPayment.patient_id == Patient.id)
        .where(Patient.org_id == org_id, Patient.deleted_at.is_(None))
    )).scalars().all())
    clinics = (await db.execute(select(Clinic).where(Clinic.org_id == org_id))).scalars().all()

    resolved = await resolve_sides(db, org_id, items)
    items = [i for i in items if _in_period(i.item_date, period, today)]
    payments = [p for p in payments if _in_period(p.payment_date, period, today)]

    owner = {'charged': 0.0, 'clinic_cost': 0.0, 'paid_to_visiting': 0.0}
    mine = {'fees': 0.0, 'costs': 0.0}
    per_clinic: dict[str | None, dict] = defaultdict(lambda: {
        'charged': 0.0, 'clinic_cost': 0.0, 'paid_to_visiting': 0.0, 'fees': 0.0, 'costs': 0.0, 'items': 0,
    })

    for it in items:
        r = resolved[it.id]
        row = per_clinic[r.clinic_id]
        row['items'] += 1
        if r.side == 'consultant':
            fee, own = _n(it.consultant_charge), _n(it.material_cost) + _n(it.other_expenses)
            mine['fees'] += fee
            mine['costs'] += own
            row['fees'] += fee
            row['costs'] += own
        else:
            charged = _n(it.charged_amount)
            cost = _n(it.consultant_charge) if it.provider_type == 'consultant' else _n(it.cost_amount)
            owner['charged'] += charged
            owner['clinic_cost'] += cost
            row['charged'] += charged
            row['clinic_cost'] += cost
            if it.provider_type == 'consultant':
                owner['paid_to_visiting'] += _n(it.consultant_charge)
                row['paid_to_visiting'] += _n(it.consultant_charge)

    paid = sum(_n(p.amount) for p in payments)
    owner['paid'] = paid
    owner['balance'] = owner['charged'] - paid
    owner['profit'] = paid - owner['clinic_cost']
    mine['profit'] = mine['fees'] - mine['costs']

    names = {str(c.id): (c.name, c.my_role or 'owner') for c in clinics}
    rows = []
    for cid, v in per_clinic.items():
        name, role = names.get(cid, ('No clinic', None)) if cid else ('No clinic', None)
        rows.append({
            'clinic_id': cid, 'name': name, 'my_role': role,
            **{k: round(x, 2) if isinstance(x, float) else x for k, x in v.items()},
            'my_profit': round(v['fees'] - v['costs'], 2),
        })
    rows.sort(key=lambda r: (r['clinic_id'] is None, r['name'].lower()))

    return {
        'period': period,
        'owner': {k: round(v, 2) for k, v in owner.items()},
        'consultant': {k: round(v, 2) for k, v in mine.items()},
        'clinics': rows,
    }
