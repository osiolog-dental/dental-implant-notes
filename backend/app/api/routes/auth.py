from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.firebase import verify_id_token
from app.db.session import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.services import email as email_service
from app.services import s3 as s3_service

router = APIRouter(prefix="/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    body: UserCreate,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    """
    Register a new doctor after they have signed up via Firebase Auth.

    The frontend must send the Firebase ID token in the Authorization header.
    We verify it, extract the firebase_uid, and create:
      - a new Organization row (one org per solo doctor for now)
      - a User row linked to that org

    If the firebase_uid already exists in the DB we return the existing user
    (idempotent — safe to call on re-login if the app isn't sure whether
    the user registered before).
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
            detail="Invalid or expired Firebase token",
        )

    firebase_uid: str = decoded["uid"]
    token_email: str = decoded.get("email", body.email)

    # Idempotency — return existing user if already registered
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    existing = result.scalar_one_or_none()
    if existing:
        return UserRead.model_validate(existing)

    # Check email not already taken by a different firebase_uid
    result = await db.execute(select(User).where(User.email == token_email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Create org (solo doctor = their own org; multi-doctor clinics added later via invites)
    org = Organization(name=body.name)
    db.add(org)
    await db.flush()  # get org.id without committing

    user = User(
        id=uuid.uuid4(),
        org_id=org.id,
        firebase_uid=firebase_uid,
        email=token_email,
        name=body.name,
        phone=body.phone,
        country=body.country,
        registration_number=body.registration_number,
        college=body.college,
        specialization=body.specialization,
        place=body.place,
    )
    db.add(user)
    await db.flush()

    # Welcome the doctor — only here, on the branch that actually creates an
    # account. The idempotent early return above and the 409 both skip it, so a
    # re-login never re-greets anyone.
    #
    # Queued rather than awaited: Resend is a blocking HTTP call with a 10s
    # timeout, and a signup must not wait on it or fail with it. Background
    # tasks run after the response, and get_db commits during dependency
    # teardown which happens first — so this only fires for an account that
    # really persisted.
    background_tasks.add_task(email_service.send_welcome_email, token_email, body.name)

    return UserRead.model_validate(user)


def _user_read_with_pic(user: User) -> UserRead:
    data = UserRead.model_validate(user)
    if user.profile_picture_key:
        try:
            data.profile_picture = s3_service.generate_download_url(user.profile_picture_key)
        except Exception:
            pass
    return data


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> UserRead:
    """Return the profile of the currently authenticated doctor."""
    return _user_read_with_pic(current_user)
