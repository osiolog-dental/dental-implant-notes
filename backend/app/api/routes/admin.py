from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth as firebase_auth
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.api.deps import require_admin
from app.core.plans import VALID_PLANS, clinic_limit
from app.db.session import get_db
from app.models.clinic import Clinic
from app.models.contact_message import ContactMessage
from app.models.implant import Implant
from app.models.organization import Organization
from app.models.patient import Patient
from app.models.sent_email import SentEmail
from app.models.user import User
from app.services import email as email_service
from app.services import referrals as referral_service
from app.services import reminder_email as reminder_email_service
from app.services import reminders as reminder_service

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
        clinic_count = int((await db.execute(
            select(func.count()).select_from(Clinic).where(Clinic.org_id == org.id)
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
            "clinic_count": clinic_count,
            "extra_clinics": org.extra_clinics,
            "clinic_limit": clinic_limit(org.plan, org.extra_clinics),
            "storage_bonus_mb": org.storage_bonus_mb,
            "created_at": org.created_at,
        })
    return results


@router.get("/referrals/pending")
async def list_pending_referrals(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """
    Signups made through a colleague's referral link, awaiting a human
    decision before the referrer's storage bonus is granted.
    """
    Referrer = aliased(Organization)
    rows = (await db.execute(
        select(Organization, Referrer)
        .join(Referrer, Organization.referred_by_org_id == Referrer.id)
        .where(Organization.referral_reward_status == "pending")
        .order_by(Organization.created_at.asc())
    )).all()

    results = []
    for referred, referrer in rows:
        owner = (await db.execute(
            select(User).where(User.org_id == referred.id).order_by(User.created_at.asc()).limit(1)
        )).scalar_one_or_none()
        referrer_owner = (await db.execute(
            select(User).where(User.org_id == referrer.id).order_by(User.created_at.asc()).limit(1)
        )).scalar_one_or_none()
        results.append({
            "referred_org_id": str(referred.id),
            "referred_name": owner.name if owner else referred.name,
            "referred_email": owner.email if owner else None,
            "signed_up_at": referred.created_at,
            "referrer_org_id": str(referrer.id),
            "referrer_name": referrer_owner.name if referrer_owner else referrer.name,
            "referrer_email": referrer_owner.email if referrer_owner else None,
            "referrer_current_bonus_mb": referrer.storage_bonus_mb,
        })
    return results


@router.post("/referrals/{referred_org_id}/approve")
async def approve_referral(
    referred_org_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    referred = await db.get(Organization, referred_org_id)
    if not referred:
        raise HTTPException(status_code=404, detail="Organization not found")
    result = await referral_service.approve_referral(db, referred)
    if not result["applied"] and result["reason"] == "not_pending":
        raise HTTPException(status_code=409, detail="This referral has already been decided")
    return result


@router.post("/referrals/{referred_org_id}/reject")
async def reject_referral(
    referred_org_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    referred = await db.get(Organization, referred_org_id)
    if not referred:
        raise HTTPException(status_code=404, detail="Organization not found")
    ok = await referral_service.reject_referral(db, referred)
    if not ok:
        raise HTTPException(status_code=409, detail="This referral has already been decided")
    return {"rejected": True}


class UpdatePlanBody(BaseModel):
    plan: str
    notes: str | None = None
    extra_clinics: int = 0


@router.patch("/organizations/{org_id}/plan")
async def update_organization_plan(
    org_id: uuid.UUID,
    body: UpdatePlanBody,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if body.plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail=f"Plan must be one of: {', '.join(VALID_PLANS)}")
    if body.extra_clinics < 0:
        raise HTTPException(status_code=400, detail="Extra clinics can't be negative")

    org = (await db.execute(select(Organization).where(Organization.id == org_id))).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.plan = body.plan
    org.plan_updated_at = datetime.now(timezone.utc)
    org.plan_notes = body.notes
    org.extra_clinics = body.extra_clinics
    db.add(org)
    await db.flush()
    return {"id": str(org.id), "plan": org.plan, "plan_updated_at": org.plan_updated_at, "extra_clinics": org.extra_clinics}


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


@router.post("/test-reminder-email")
async def test_reminder_email(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Send the daily reminder digest now, to the admin's own inbox, built from
    their own real due data — so the email can be seen without waiting for the
    08:05 IST job.

    Goes only to the admin's own address. It never emails another doctor, and
    it changes nothing: the scheduled job still runs as normal.
    """
    follow_ups = await reminder_service.follow_ups_due(db, admin.org_id)
    second_stage = await reminder_service.second_stage_due(db, admin.org_id)
    extractions = await reminder_service.extraction_sites_due(db, admin.org_id)

    counts = {
        "follow_ups": len(follow_ups),
        "second_stage": len(second_stage),
        "extraction_sites": len(extractions),
    }

    if not (follow_ups or second_stage or extractions):
        # Not an error — the digest is deliberately never sent empty.
        return {
            "sent": False,
            "reason": "nothing_due",
            "detail": "Nothing is due right now, so no email was sent. That is the intended behaviour.",
            "counts": counts,
        }

    ok = reminder_email_service.send_digest(
        admin.email, admin.name, follow_ups, second_stage, extractions
    )
    if not ok:
        raise HTTPException(
            status_code=502,
            detail="The email service rejected the message or is not configured.",
        )

    return {"sent": True, "to": admin.email, "counts": counts}


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
