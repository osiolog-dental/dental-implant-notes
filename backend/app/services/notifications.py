from __future__ import annotations

import logging
from datetime import date, timedelta

import requests as _requests
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.audit import DeviceToken
from app.models.implant import Implant
from app.models.case import Case
from app.models.patient import Patient
from app.models.user import User
from app.services import reminder_email, reminders

logger = logging.getLogger("osiolog.notifications")

_FCM_ENDPOINT = (
    "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
)
_FCM_SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]


def _get_access_token() -> str:
    """
    Get a short-lived OAuth2 access token using Application Default Credentials.
    Works with: gcloud auth application-default login on the server (no key file needed).
    Falls back to the service account JSON in settings if ADC is unavailable.
    """
    import google.auth
    import google.auth.transport.requests

    sa = settings.FIREBASE_SERVICE_ACCOUNT_JSON
    if sa and sa.strip().startswith("{"):
        import json
        from google.oauth2 import service_account
        creds = service_account.Credentials.from_service_account_info(
            json.loads(sa), scopes=_FCM_SCOPES
        )
    elif sa and __import__("os").path.exists(sa):
        from google.oauth2 import service_account
        creds = service_account.Credentials.from_service_account_file(
            sa, scopes=_FCM_SCOPES
        )
    else:
        creds, _ = google.auth.default(scopes=_FCM_SCOPES)

    creds.refresh(google.auth.transport.requests.Request())
    return creds.token


async def send_fcm_notification(
    token: str, title: str, body: str, data: dict | None = None
) -> bool:
    """
    Send a single FCM notification via the HTTP v1 REST API.
    Uses Application Default Credentials — no service account key file required.
    On the server: run `gcloud auth application-default login` once to set up ADC.
    """
    project_id = settings.FIREBASE_PROJECT_ID
    if not project_id:
        logger.error("FIREBASE_PROJECT_ID not configured — cannot send FCM")
        return False

    try:
        access_token = _get_access_token()
    except Exception as exc:
        logger.error("FCM: failed to get access token: %s", exc)
        return False

    payload = {
        "message": {
            "token": token,
            "notification": {"title": title, "body": body},
            "data": {k: str(v) for k, v in (data or {}).items()},
        }
    }

    try:
        resp = _requests.post(
            _FCM_ENDPOINT.format(project_id=project_id),
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        if resp.status_code == 200:
            return True
        # 404 means the device token is no longer valid
        if resp.status_code == 404 or (
            resp.status_code == 400
            and "UNREGISTERED" in resp.text
        ):
            logger.warning("FCM token unregistered: %s", token[:20])
            return False
        logger.error("FCM send failed %s: %s", resp.status_code, resp.text)
        return False
    except Exception as exc:
        logger.error("FCM send failed: %s", exc)
        return False


async def send_followup_reminders() -> None:
    """
    Daily job: send FCM notifications to doctors for implant follow-ups
    due within the next 7 days. Runs each morning at 8 AM IST (02:30 UTC).
    """
    today = date.today()
    window_end = today + timedelta(days=7)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Implant, Case, Patient, User)
            .join(Case, Implant.case_id == Case.id)
            .join(Patient, Case.patient_id == Patient.id)
            .join(User, Patient.doctor_id == User.id)
            .where(
                Implant.follow_up_date.isnot(None),
                Implant.follow_up_date >= today,
                Implant.follow_up_date <= window_end,
                Implant.osseointegration_success.is_(None),
                reminders.NOT_FAILED,  # no follow-up push for a failed implant
            )
        )
        rows = result.all()

        if not rows:
            logger.info("No upcoming follow-ups found for today")
            return

        doctor_followups: dict = {}
        for implant, case, patient, doctor in rows:
            uid = doctor.id
            if uid not in doctor_followups:
                doctor_followups[uid] = {"doctor": doctor, "items": []}
            days_left = (implant.follow_up_date - today).days
            doctor_followups[uid]["items"].append(
                {"patient": patient.name, "tooth": implant.tooth_number, "days": days_left}
            )

        for uid, info in doctor_followups.items():
            tokens_result = await db.execute(
                select(DeviceToken).where(DeviceToken.user_id == uid)
            )
            tokens = tokens_result.scalars().all()
            if not tokens:
                continue

            count = len(info["items"])
            if count == 1:
                item = info["items"][0]
                days_text = "today" if item["days"] == 0 else f"in {item['days']} day{'s' if item['days'] > 1 else ''}"
                title = "Follow-up Due"
                body = f"{item['patient']} — Tooth {item['tooth']} follow-up {days_text}"
            else:
                title = f"{count} Follow-ups Due Soon"
                names = ", ".join(f"{i['patient']} (T{i['tooth']})" for i in info["items"][:3])
                body = names + (" and more" if count > 3 else "")

            for token_row in tokens:
                success = await send_fcm_notification(
                    token_row.fcm_token, title, body,
                    data={"type": "followup_reminder", "count": str(count)}
                )
                if not success:
                    await db.delete(token_row)

        await db.commit()
        logger.info("Follow-up reminders sent to %d doctors", len(doctor_followups))


async def send_reminder_emails() -> None:
    """
    Daily job: email each doctor a digest of what is clinically due.

    Two rules keep this from becoming noise a dentist learns to ignore:
    only doctors who have not switched it off get one, and only when something
    is actually due. An empty "nothing to do" email every morning is exactly
    how the one that matters gets skipped.

    One doctor's failure never stops the rest of the run.
    """
    import asyncio

    attempted = 0
    delivered = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.reminder_emails_enabled.is_(True))
        )
        doctors = result.scalars().all()

        for doctor in doctors:
            if not doctor.email:
                continue
            try:
                follow_ups = await reminders.follow_ups_due(db, doctor.org_id)
                second_stage = await reminders.second_stage_due(db, doctor.org_id)
                extractions = await reminders.extraction_sites_due(db, doctor.org_id)
            except Exception as exc:
                logger.error("Reminder digest query failed for %s: %s", doctor.email, exc)
                continue

            if not (follow_ups or second_stage or extractions):
                continue

            attempted += 1
            try:
                # Resend is a blocking HTTP call with a 10s timeout — run it off
                # the event loop so one slow send cannot stall the whole run.
                ok = await asyncio.to_thread(
                    reminder_email.send_digest,
                    doctor.email,
                    doctor.name,
                    follow_ups,
                    second_stage,
                    extractions,
                )
                delivered += 1 if ok else 0
            except Exception as exc:
                logger.error("Reminder digest send failed for %s: %s", doctor.email, exc)

    logger.info("Reminder digests: %d attempted, %d delivered", attempted, delivered)


def start_scheduler() -> None:
    """Start APScheduler with the daily 8 AM IST (02:30 UTC) follow-up reminder job."""
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
    except ImportError:
        logger.warning("APScheduler not installed — push notification scheduler disabled")
        return

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        send_followup_reminders,
        CronTrigger(hour=2, minute=30, timezone="UTC"),
        id="followup_reminders",
        replace_existing=True,
    )
    # 02:35 UTC — five minutes behind the push, so the two do not contend for
    # the same worker at the same instant.
    scheduler.add_job(
        send_reminder_emails,
        CronTrigger(hour=2, minute=35, timezone="UTC"),
        id="reminder_emails",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "Reminder schedulers started: FCM push 02:30 UTC, email digest 02:35 UTC "
        "(08:00 / 08:05 IST)"
    )
