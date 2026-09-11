from __future__ import annotations

import requests

from app.core.config import settings

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


def send_email(to_email: str, subject: str, body_text: str) -> bool:
    """
    Send a plain-text email to an arbitrary recipient — used by the admin
    panel for maintenance notices, offers, and one-off customer replies.
    """
    if not is_configured():
        return False

    payload = {
        "from": RESEND_FROM,
        "to": [to_email],
        "subject": subject,
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
