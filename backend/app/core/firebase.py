from __future__ import annotations

import json
import os

import firebase_admin
from firebase_admin import auth, credentials

from app.core.config import settings

_app: firebase_admin.App | None = None


def _init_firebase() -> firebase_admin.App:
    """Initialise the Firebase Admin SDK once. Subsequent calls return the existing app."""
    global _app
    if _app is not None:
        return _app

    sa = settings.FIREBASE_SERVICE_ACCOUNT_JSON

    if sa and sa.strip().startswith("{"):
        # Inline JSON service account string
        cred = credentials.Certificate(json.loads(sa))
        _app = firebase_admin.initialize_app(cred)
    elif sa and os.path.exists(sa):
        # File path to service account JSON
        _app = firebase_admin.initialize_app(credentials.Certificate(sa))
    else:
        # No service account available — use project ID only.
        # Firebase Admin SDK verifies tokens using Google's public JWKS endpoint,
        # which does not require a service account key.
        _app = firebase_admin.initialize_app(
            options={"projectId": settings.FIREBASE_PROJECT_ID}
        )

    return _app


# Initialise on import
_init_firebase()


def verify_id_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token and return the decoded claims.

    Raises firebase_admin.auth.InvalidIdTokenError (or subclasses) on failure.
    The caller is responsible for converting this to an HTTP 401.
    """
    return auth.verify_id_token(id_token)
