from __future__ import annotations

import json
import os
import time
from typing import Any

import jwt
import requests
import firebase_admin
from firebase_admin import credentials

from app.core.config import settings

_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
_ISSUER_PREFIX = "https://securetoken.google.com/"

_jwks_cache: dict[str, Any] = {}
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 3600.0

_app: firebase_admin.App | None = None


def _init_firebase() -> firebase_admin.App:
    """Initialise the Firebase Admin SDK once (needed for FCM and user management)."""
    global _app
    if _app is not None:
        return _app

    sa = settings.FIREBASE_SERVICE_ACCOUNT_JSON

    if sa and sa.strip().startswith("{"):
        cred = credentials.Certificate(json.loads(sa))
    elif sa and os.path.exists(sa):
        cred = credentials.Certificate(sa)
    else:
        cred = credentials.Base()

    _app = firebase_admin.initialize_app(cred, options={"projectId": settings.FIREBASE_PROJECT_ID})
    return _app


_init_firebase()


def _get_jwks() -> dict[str, Any]:
    global _jwks_cache, _jwks_fetched_at
    now = time.time()
    if not _jwks_cache or (now - _jwks_fetched_at) > _JWKS_TTL:
        resp = requests.get(_JWKS_URL, timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_fetched_at = now
    return _jwks_cache


def verify_id_token(id_token: str) -> dict[str, Any]:
    """Verify a Firebase ID token using Google's public JWKS. No service account needed."""
    project_id = settings.FIREBASE_PROJECT_ID
    if not project_id:
        raise ValueError("FIREBASE_PROJECT_ID is not configured")

    try:
        header = jwt.get_unverified_header(id_token)
    except jwt.exceptions.DecodeError as exc:
        raise ValueError(f"Invalid Firebase token header: {exc}") from exc

    kid = header.get("kid")
    if not kid:
        raise ValueError("Firebase token missing 'kid' in header")

    jwks = _get_jwks()
    matching_keys = [k for k in jwks.get("keys", []) if k.get("kid") == kid]
    if not matching_keys:
        # Key may have rotated — force refresh once
        global _jwks_fetched_at
        _jwks_fetched_at = 0.0
        jwks = _get_jwks()
        matching_keys = [k for k in jwks.get("keys", []) if k.get("kid") == kid]
    if not matching_keys:
        raise ValueError(f"Firebase token 'kid' {kid!r} not found in Google JWKS")

    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(matching_keys[0])

    try:
        claims = jwt.decode(
            id_token,
            key=public_key,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"{_ISSUER_PREFIX}{project_id}",
            options={"verify_exp": True},
        )
    except jwt.ExpiredSignatureError as exc:
        raise ValueError("Firebase token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise ValueError(f"Firebase token invalid: {exc}") from exc

    if "sub" not in claims or not claims["sub"]:
        raise ValueError("Firebase token missing 'sub' claim")
    claims.setdefault("uid", claims["sub"])

    return claims
