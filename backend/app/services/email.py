from __future__ import annotations

import logging
import re

import requests

from app.core.config import settings

logger = logging.getLogger("osiolog.email")

CONTACT_RECIPIENT = "admin@osiolog.com"
RESEND_ENDPOINT = "https://api.resend.com/emails"
# osiolog.com is verified with Resend (DKIM/SPF/DMARC), so we can send to
# any recipient now — not just admin@osiolog.com.
RESEND_FROM = "Osiolog <hello@osiolog.com>"


def is_configured() -> bool:
    return bool(settings.RESEND_API_KEY)


def send_contact_notification(name: str | None, email: str, subject: str | None, message: str) -> bool:
    """
    Send a plain-text notification email for a new Contact Us submission via
    Resend's HTTP API. Returns True if actually sent, False if Resend isn't
    configured or sending failed — callers should treat False as non-fatal,
    since the message is always saved to the database regardless.
    """
    if not is_configured():
        return False

    body_text = (
        f"From: {name or 'Unknown'} <{email}>\n"
        f"Subject: {subject or '(no subject)'}\n\n"
        f"{message}\n"
    )

    payload = {
        "from": RESEND_FROM,
        "to": [CONTACT_RECIPIENT],
        "reply_to": [email],
        "subject": f"[Osiolog Contact] {subject or 'New message'}",
        "text": body_text,
    }

    try:
        response = requests.post(
            RESEND_ENDPOINT,
            json=payload,
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            timeout=10,
        )
        return response.status_code == 200
    except Exception:
        return False


def send_email(to_email: str, subject: str, body_text: str, reply_to: str | None = None) -> bool:
    """
    Send a plain-text email to an arbitrary recipient — used by the admin
    panel for maintenance notices, offers, and one-off customer replies.

    `reply_to` points replies somewhere other than the From address; omit it
    and replies go to RESEND_FROM.
    """
    if not is_configured():
        return False

    payload = {
        "from": RESEND_FROM,
        "to": [to_email],
        "subject": subject,
        "text": body_text,
    }
    if reply_to:
        payload["reply_to"] = [reply_to]

    try:
        response = requests.post(
            RESEND_ENDPOINT,
            json=payload,
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            timeout=10,
        )
        return response.status_code == 200
    except Exception:
        return False


def _honorific(name: str | None) -> str:
    """
    "Dr Sharma" — but never "Dr Dr Sharma". Doctors routinely type their own
    title into the name field, so a title is only added when there isn't one.
    Falls back to "there" rather than greeting an empty string.
    """
    clean = (name or "").strip()
    if not clean:
        return "there"
    # The word boundary matters: without it "Drew" and "Dravid" read as titled.
    if re.match(r"^(dr|prof|professor)\b\.?", clean, re.IGNORECASE):
        return clean
    return f"Dr {clean}"


def send_welcome_email(to_email: str, name: str | None) -> bool:
    """
    Greet a newly registered doctor.

    Called from a FastAPI background task after registration has committed, so
    it cannot delay a signup and cannot fail one: the account exists whatever
    happens here, and the return value is advisory. Replies go to the same
    inbox as Contact Us messages, since the copy invites one.
    """
    who = _honorific(name)
    body_text = f"""Hi {who},

Your Osiolog account is ready. It's built to keep implant records in one
place — the chart, the healing timeline, the photos, the costs.

Three things worth doing first:

1. Add a patient — Patients > Add Patient
2. Log an implant on the tooth chart, with the brand, torque and surgery
   date
3. Set a follow-up date — it will appear in your reminders when it comes
   due

Anything not working, reply to this email.

— The Osiolog team
"""

    if not is_configured():
        logger.warning("Resend not configured — no welcome email sent to %s", to_email)
        return False

    sent = send_email(
        to_email,
        f"Welcome to Osiolog, {who}",
        body_text,
        reply_to=CONTACT_RECIPIENT,
    )
    if sent:
        logger.info("Welcome email sent to %s", to_email)
    else:
        logger.error("Welcome email FAILED for %s", to_email)
    return sent
