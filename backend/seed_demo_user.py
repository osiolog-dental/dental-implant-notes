"""
Seed a demo user into Firebase Auth + PostgreSQL.

Usage (from backend/):
    python3 seed_demo_user.py

Creates:
  Firebase account: doctor@dentalapp.com / doctor123
  DB row: same email, name "Demo Doctor", org "Demo Clinic"

Safe to run multiple times — idempotent.
"""
from __future__ import annotations

import asyncio
import uuid

from firebase_admin import auth as firebase_auth
from sqlalchemy import select

from app.core.firebase import _init_firebase  # ensures Firebase is initialised
from app.db.session import AsyncSessionLocal

# Import ALL models so SQLAlchemy can resolve all relationships
import app.models  # noqa: F401  (registers all models via __init__)
from app.models.organization import Organization
from app.models.user import User

DEMO_EMAIL = "doctor@dentalapp.com"
DEMO_PASSWORD = "doctor123"
DEMO_NAME = "Demo Doctor"
ORG_NAME = "Demo Clinic"


def _ensure_firebase_user() -> str:
    """Create the Firebase user if it doesn't exist. Returns the firebase_uid."""
    _init_firebase()
    try:
        fb_user = firebase_auth.get_user_by_email(DEMO_EMAIL)
        print(f"[Firebase] User already exists: {fb_user.uid}")
        return fb_user.uid
    except firebase_auth.UserNotFoundError:
        fb_user = firebase_auth.create_user(
            email=DEMO_EMAIL,
            password=DEMO_PASSWORD,
            display_name=DEMO_NAME,
            email_verified=True,
        )
        print(f"[Firebase] Created user: {fb_user.uid}")
        return fb_user.uid


async def _ensure_db_user(firebase_uid: str) -> None:
    async with AsyncSessionLocal() as session:
        # Check if user already in DB
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"[DB] User already exists: {existing.id}")
            return

        # Create org
        org = Organization(name=ORG_NAME)
        session.add(org)
        await session.flush()

        # Create user
        user = User(
            id=uuid.uuid4(),
            org_id=org.id,
            firebase_uid=firebase_uid,
            email=DEMO_EMAIL,
            name=DEMO_NAME,
            specialization="Implantology",
            country="India",
        )
        session.add(user)
        await session.commit()
        print(f"[DB] Created user: {user.id} in org: {org.id}")


async def main() -> None:
    firebase_uid = _ensure_firebase_user()
    await _ensure_db_user(firebase_uid)
    print("\nDone! Demo credentials:")
    print(f"  Email:    {DEMO_EMAIL}")
    print(f"  Password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
