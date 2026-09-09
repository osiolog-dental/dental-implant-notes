from __future__ import annotations

import requests

from app.core.config import settings

CONTACT_RECIPIENT = "admin@osiolog.com"
SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send"


def is_configured() -> bool:
    return bool(settings.SENDGRID_API_KEY)


def send_contact_notification(name: str | None, email: str, subject: str | None, message: str) -> bool:
    """
    Send a plain-text notification email for a new Contact Us submission via
    SendGrid's HTTP API. Returns True if actually sent, False if SendGrid
    isn't configured or sending failed — callers should treat False as
    non-fatal, since the message is always saved to the database regardless.
    """
    if not is_configured():
        return False

    body_text = (
        f"From: {name or 'Unknown'} <{email}>\n"
        f"Subject: {subject or '(no subject)'}\n\n"
        f"{message}\n"
    )

    payload = {
        "personalizations": [{"to": [{"email": CONTACT_RECIPIENT}]}],
        "from": {"email": CONTACT_RECIPIENT, "name": "Osiolog Contact Form"},
        "reply_to": {"email": email},
        "subject": f"[Osiolog Contact] {subject or 'New message'}",
        "content": [{"type": "text/plain", "value": body_text}],
    }

    try:
        response = requests.post(
            SENDGRID_ENDPOINT,
            json=payload,
            headers={"Authorization": f"Bearer {settings.SENDGRID_API_KEY}"},
            timeout=10,
        )
        return response.status_code == 202
    except Exception:
        return False
