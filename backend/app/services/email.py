from __future__ import annotations

import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

CONTACT_RECIPIENT = "admin@osiolog.com"


def is_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def send_contact_notification(name: str | None, email: str, subject: str | None, message: str) -> bool:
    """
    Send a plain-text notification email for a new Contact Us submission.
    Returns True if actually sent, False if SMTP isn't configured or sending
    failed — callers should treat False as non-fatal, since the message is
    always saved to the database regardless.
    """
    if not is_configured():
        return False

    msg = EmailMessage()
    msg["Subject"] = f"[Osiolog Contact] {subject or 'New message'}"
    msg["From"] = settings.SMTP_USER
    msg["To"] = CONTACT_RECIPIENT
    if email:
        msg["Reply-To"] = email
    msg.set_content(
        f"From: {name or 'Unknown'} <{email}>\n"
        f"Subject: {subject or '(no subject)'}\n\n"
        f"{message}\n"
    )

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT or 587) as server:
            server.starttls(context=context)
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception:
        return False
