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

    # Accept either a file path or an inline JSON string (useful in CI)
    if sa.startswith("{"):
        cred = credentials.Certificate(json.loads(sa))
    else:
        # Resolve relative paths from the backend/ directory
        path = sa if os.path.isabs(sa) else os.path.join(
            os.path.dirname(__file__), "..", "..", sa
        )
        cred = credentials.Certificate(os.path.normpath(path))

    _app = firebase_admin.initialize_app(cred)
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
