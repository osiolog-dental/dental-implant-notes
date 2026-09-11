from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth as firebase_auth
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.plans import VALID_PLANS
from app.db.session import get_db
from app.models.contact_message import ContactMessage
from app.models.implant import Implant
from app.models.organization import Organization
from app.models.patient import Patient
from app.models.sent_email import SentEmail
from app.models.user import User
from app.services import email as email_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
async def admin_overview(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    total_orgs = int((await db.execute(select(func.count()).select_from(Organization))).scalar_one())
    total_patients = int((await db.execute(
        select(func.count()).select_from(Patient).where(Patient.deleted_at.is_(None))
    )).scalar_one())
    total_implants = int((await db.execute(select(func.count()).select_from(Implant))).scalar_one())

    plan_rows = (await db.execute(select(Organization.plan, func.count()).group_by(Organization.plan))).all()
    plan_breakdown = {plan: count for plan, count in plan_rows}
    for p in VALID_PLANS:
        plan_breakdown.setdefault(p, 0)

    total_users = int((await db.execute(select(func.count()).select_from(User))).scalar_one())

    # Growth — signups per calendar month, oldest first.
    month = func.date_trunc('month', User.created_at)
    growth_rows = (await db.execute(
        select(month.label("month"), func.count()).group_by(month).order_by(month)
    )).all()
    signups_by_month = [{"month": m.strftime("%Y-%m"), "count": c} for m, c in growth_rows]

    # Where users are signing up from — self-reported country on their profile.
    country_col = func.coalesce(User.country, "Unknown")
    country_rows = (await db.execute(
        select(country_col.label("country"), func.count()).group_by(country_col).order_by(func.count().desc())
    )).all()
    users_by_country = [{"country": c, "count": n} for c, n in country_rows]

    return {
        "total_organizations": total_orgs,
        "total_patients": total_patients,
        "total_implants": total_implants,
        "total_users": total_users,
        "plan_breakdown": plan_breakdown,
        "signups_by_month": signups_by_month,
        "users_by_country": users_by_country,
    }


@router.get("/organizations")
async def list_organizations(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    orgs = (await db.execute(select(Organization).order_by(Organization.created_at.desc()))).scalars().all()

    results = []
    for org in orgs:
        owner = (await db.execute(
            select(User).where(User.org_id == org.id).order_by(User.created_at.asc()).limit(1)
        )).scalar_one_or_none()
        patient_count = int((await db.execute(
            select(func.count()).select_from(Patient).where(Patient.org_id == org.id, Patient.deleted_at.is_(None))
        )).scalar_one())
        implant_count = int((await db.execute(
            select(func.count()).select_from(Implant)
            .join(Patient, Implant.patient_id == Patient.id)
            .where(Patient.org_id == org.id)
        )).scalar_one())

        results.append({
            "id": str(org.id),
            "name": org.name,
            "owner_name": owner.name if owner else None,
            "owner_email": owner.email if owner else None,
            "owner_country": owner.country if owner else None,
            "plan": org.plan,
            "plan_updated_at": org.plan_updated_at,
            "plan_notes": org.plan_notes,
            "patient_count": patient_count,
            "implant_count": implant_count,
            "created_at": org.created_at,
        })
    return results


class UpdatePlanBody(BaseModel):
    plan: str
    notes: str | None = None


@router.patch("/organizations/{org_id}/plan")
async def update_organization_plan(
    org_id: uuid.UUID,
    body: UpdatePlanBody,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if body.plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail=f"Plan must be one of: {', '.join(VALID_PLANS)}")

    org = (await db.execute(select(Organization).where(Organization.id == org_id))).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.plan = body.plan
    org.plan_updated_at = datetime.now(timezone.utc)
    org.plan_notes = body.notes
    db.add(org)
    await db.flush()
    return {"id": str(org.id), "plan": org.plan, "plan_updated_at": org.plan_updated_at}


class SendEmailBody(BaseModel):
    recipients: list[str]
    subject: str
    message: str


@router.post("/send-email")
async def send_admin_email(
    body: SendEmailBody,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Sends the same subject/message to one or many recipients — maintenance
    notices, promotional offers, or a one-off reply to a specific person.
    Each send is logged to sent_emails so it can be reviewed later from
    GET /admin/sent-emails.
    """
    recipients = [r.strip() for r in body.recipients if r.strip()]
    if not recipients:
        raise HTTPException(status_code=400, detail="Add at least one recipient")

    sent, failed = [], []
    for recipient in recipients:
        ok = email_service.send_email(recipient, body.subject, body.message)
        (sent if ok else failed).append(recipient)
        db.add(SentEmail(
            recipient=recipient,
            subject=body.subject,
            message=body.message,
            delivered=ok,
        ))
    await db.flush()

    return {"sent": sent, "failed": failed}


@router.get("/sent-emails")
async def list_sent_emails(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """History of every email sent from the admin panel, most recent first."""
    emails = (await db.execute(
        select(SentEmail).order_by(SentEmail.created_at.desc()).limit(200)
    )).scalars().all()
    return [
        {
            "id": str(e.id),
            "recipient": e.recipient,
            "subject": e.subject,
            "message": e.message,
            "delivered": e.delivered,
            "created_at": e.created_at,
        }
        for e in emails
    ]


@router.get("/firebase-users")
async def list_firebase_users(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """
    Every Firebase Auth account, cross-referenced against our own users
    table. Someone who signs up via Firebase but never finishes the app's
    registration step never gets a row in `users` — so they're invisible
    everywhere else in this admin panel. This surfaces them too, flagged
    as not yet registered, so drop-offs are visible for growth analysis.
    """
    db_uids = set((await db.execute(select(User.firebase_uid))).scalars().all())

    results = []
    try:
        page = firebase_auth.list_users()
        while page:
            for u in page.users:
                created_ms = u.user_metadata.creation_timestamp
                last_login_ms = u.user_metadata.last_sign_in_timestamp
                results.append({
                    "uid": u.uid,
                    "email": u.email,
                    "provider": u.provider_data[0].provider_id if u.provider_data else None,
                    "created_at": datetime.fromtimestamp(created_ms / 1000, tz=timezone.utc) if created_ms else None,
                    "last_login_at": datetime.fromtimestamp(last_login_ms / 1000, tz=timezone.utc) if last_login_ms else None,
                    "registered_in_app": u.uid in db_uids,
                })
            page = page.get_next_page()
    except NotImplementedError:
        raise HTTPException(
            status_code=502,
            detail="Firebase Admin credentials aren't configured on the server — "
                   "set FIREBASE_SERVICE_ACCOUNT_JSON to a real service account key "
                   "to enable this list.",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Firebase Admin API: {exc}")

    results.sort(key=lambda u: u["created_at"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return results


@router.get("/contact-messages")
async def list_contact_messages(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    messages = (await db.execute(
        select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(100)
    )).scalars().all()
    return [
        {
            "id": str(m.id),
            "name": m.name,
            "email": m.email,
            "subject": m.subject,
            "message": m.message,
            "email_sent": m.email_sent,
            "created_at": m.created_at,
        }
        for m in messages
    ]
