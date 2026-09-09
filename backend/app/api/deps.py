from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.firebase import verify_id_token
from app.db.session import get_db
from app.models.user import User

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency used by every protected route.

    Flow:
      1. Extract Bearer token from Authorization header.
      2. Verify it with Firebase Admin SDK.
      3. Look up the User row by firebase_uid.
      4. Return the ORM User object — routes use it directly.

    Raises HTTP 401 for missing/invalid token, 404 if user not in DB yet.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )

    try:
        decoded = verify_id_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    firebase_uid: str = decoded["uid"]

    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found — please register first",
        )

    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """
    Like get_current_user, but returns None instead of raising — for routes
    that must work for both logged-in users and anonymous visitors (e.g. the
    public Landing page's Contact Us form).
    """
    if not credentials:
        return None
    try:
        decoded = verify_id_token(credentials.credentials)
        result = await db.execute(select(User).where(User.firebase_uid == decoded["uid"]))
        return result.scalar_one_or_none()
    except Exception:
        return None
