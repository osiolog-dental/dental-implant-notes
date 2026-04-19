from __future__ import annotations

import json
import os
import time
from typing import Any

import firebase_admin
from firebase_admin import auth, credentials

from app.core.config import settings

_app: firebase_admin.App | None = None


def _init_firebase() -> firebase_admin.App:
    """Initialise the Firebase Admin SDK once."""
    global _app
    if _app is not None:
        return _app

    sa = settings.FIREBASE_SERVICE_ACCOUNT_JSON

    if sa and sa.strip().startswith("{"):
        cred = credentials.Certificate(json.loads(sa))
    elif sa and os.path.exists(sa):
        cred = credentials.Certificate(sa)
    else:
        # No service account key — use a no-op credential.
        # verify_id_token() works without a service account: it fetches
        # Google's public JWKS certs to verify the RS256 signature.
        cred = credentials.Base()

    _app = firebase_admin.initialize_app(cred, options={"projectId": settings.FIREBASE_PROJECT_ID})
    return _app


_init_firebase()


def verify_id_token(id_token: str) -> dict[str, Any]:
    """Verify a Firebase ID token and return decoded claims."""
    return auth.verify_id_token(id_token, app=_app, check_revoked=False)
