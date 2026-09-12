from __future__ import annotations

import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

import requests

from app.core.config import settings

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"
DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files"
DRIVE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"

SCOPE = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email"
APP_FOLDER_NAME = "Osiolog Photos"

_STATE_TTL_SECONDS = 600  # 10 minutes to complete the OAuth round trip


def is_configured() -> bool:
    return bool(settings.GOOGLE_OAUTH_CLIENT_ID and settings.GOOGLE_OAUTH_CLIENT_SECRET and settings.GOOGLE_OAUTH_REDIRECT_URI)


# ── CSRF-safe state param — signs org_id + timestamp so the callback can't
# be tricked into linking a Drive account to the wrong org. ──────────────────

def sign_state(org_id: str) -> str:
    ts = str(int(time.time()))
    payload = f"{org_id}:{ts}"
    sig = hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def verify_state(state: str) -> str:
    """Returns the org_id if valid, raises ValueError otherwise."""
    try:
        org_id, ts, sig = state.split(":")
    except ValueError:
        raise ValueError("Malformed state parameter")

    expected_sig = hmac.new(settings.SECRET_KEY.encode(), f"{org_id}:{ts}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise ValueError("Invalid state signature")
    if time.time() - int(ts) > _STATE_TTL_SECONDS:
        raise ValueError("State expired — please try connecting again")
    return org_id


def get_oauth_url(org_id: str) -> str:
    params = {
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",  # forces a refresh_token even on repeat connects
        "state": sign_state(org_id),
    }
    query = "&".join(f"{k}={quote(v, safe='')}" for k, v in params.items())
    return f"{AUTH_URL}?{query}"


def exchange_code(code: str) -> dict[str, Any]:
    resp = requests.post(TOKEN_URL, data={
        "code": code,
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "grant_type": "authorization_code",
    }, timeout=15)
    resp.raise_for_status()
    return resp.json()


def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    resp = requests.post(TOKEN_URL, data={
        "refresh_token": refresh_token,
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
        "grant_type": "refresh_token",
    }, timeout=15)
    resp.raise_for_status()
    return resp.json()


def get_user_email(access_token: str) -> str | None:
    resp = requests.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
    if resp.status_code != 200:
        return None
    return resp.json().get("email")


def revoke(access_token: str) -> None:
    try:
        requests.post(DRIVE_REVOKE_URL, params={"token": access_token}, timeout=10)
    except Exception:
        pass  # best-effort — the connection row is deleted regardless


def ensure_app_folder(access_token: str) -> str:
    """Finds (or creates) the "Osiolog Photos" folder in the user's Drive."""
    headers = {"Authorization": f"Bearer {access_token}"}
    query = f"name='{APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    resp = requests.get(DRIVE_FILES_URL, headers=headers, params={"q": query, "fields": "files(id)"}, timeout=15)
    resp.raise_for_status()
    files = resp.json().get("files", [])
    if files:
        return files[0]["id"]

    resp = requests.post(
        DRIVE_FILES_URL,
        headers={**headers, "Content-Type": "application/json"},
        json={"name": APP_FOLDER_NAME, "mimeType": "application/vnd.google-apps.folder"},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["id"]


def upload_file(access_token: str, folder_id: str, filename: str, data: bytes, content_type: str) -> str:
    """Uploads raw bytes to the app folder, returns the new file's Drive id."""
    metadata = {"name": filename, "parents": [folder_id]}
    boundary = "osiolog-upload-boundary"
    body = (
        f"--{boundary}\r\n"
        f"Content-Type: application/json; charset=UTF-8\r\n\r\n"
        f"{json.dumps(metadata)}\r\n"
        f"--{boundary}\r\n"
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode() + data + f"\r\n--{boundary}--".encode()

    resp = requests.post(
        DRIVE_UPLOAD_URL,
        params={"uploadType": "multipart"},
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": f"multipart/related; boundary={boundary}",
        },
        data=body,
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["id"]


def download_file(access_token: str, file_id: str) -> bytes:
    resp = requests.get(
        f"{DRIVE_FILES_URL}/{file_id}",
        params={"alt": "media"},
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content


def delete_file(access_token: str, file_id: str) -> None:
    try:
        requests.delete(f"{DRIVE_FILES_URL}/{file_id}", headers={"Authorization": f"Bearer {access_token}"}, timeout=15)
    except Exception:
        pass


def token_expiry_from(expires_in_seconds: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds - 60)  # 60s safety margin


# ── Signed content-proxy URLs ─────────────────────────────────────────────────
# <img> tags can't send an Authorization header, so a Drive-backed image's
# "download URL" is a link into our own API whose signature (not a login
# session) proves it's legitimate — the same trust model as an S3 presigned
# URL. Shared by any route that needs to hand back a viewable image URL
# (routes/cases.py's own endpoints, and the patient-photos/backup exports in
# routes/flat_routes.py).

def sign_content(image_id: Any, thumb: bool, exp: int) -> str:
    payload = f"{image_id}:{int(thumb)}:{exp}"
    return hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()


def content_url(base_url: str, image_id: Any, thumb: bool) -> str:
    exp = int(time.time()) + 3600
    sig = sign_content(image_id, thumb, exp)
    return f"{base_url.rstrip('/')}/api/cases/images/{image_id}/drive-content?thumb={int(thumb)}&exp={exp}&sig={sig}"
