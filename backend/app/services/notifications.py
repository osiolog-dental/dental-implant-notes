from __future__ import annotations

import logging
from datetime import date, timedelta

from firebase_admin import messaging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.audit import DeviceToken
from app.models.implant import Implant
from app.models.case import Case
from app.models.patient import Patient
from app.models.user import User

logger = logging.getLogger("dentalhub.notifications")


async def send_fcm_notification(
    token: str, title: str, body: str, data: dict | None = None
) -> bool:
    """Send a single FCM notification. Returns True on success, False on failure."""
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        data={k: str(v) for k, v in (data or {}).items()},
        token=token,
    )
    try:
        messaging.send(message)
        return True
    except messaging.UnregisteredError:
        logger.warning("FCM token unregistered: %s", token[:20])
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
    scheduler.start()
    logger.info("Follow-up reminder scheduler started (daily 08:00 IST / 02:30 UTC)")
