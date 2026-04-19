"""
Seed a demo user into PostgreSQL.

Usage (from backend/):
    python3 seed_demo_user.py

Creates (or updates) the DB row for doctor@dentalapp.com.
The Firebase account was created manually in osiolog-prod.
Safe to run multiple times — idempotent.
"""
from __future__ import annotations

import asyncio
import uuid

from sqlalchemy import select, update

from app.db.session import AsyncSessionLocal

import app.models  # noqa: F401
from app.models.organization import Organization
from app.models.user import User

DEMO_EMAIL = "doctor@dentalapp.com"
DEMO_NAME = "Demo Doctor"
ORG_NAME = "Demo Clinic"
# UID from osiolog-prod Firebase project
DEMO_FIREBASE_UID = "tWx2h6n5vwO0Isiqe09O7YCUKBm1"


async def main() -> None:
    async with AsyncSessionLocal() as session:
        # Check if already registered with the correct UID
        result = await session.execute(
            select(User).where(User.firebase_uid == DEMO_FIREBASE_UID)
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"[DB] Demo user already correct: {existing.id} — firebase_uid matches osiolog-prod")
            return

        # Check if row exists with old UID (from previous project osioloc-prod)
        result = await session.execute(
            select(User).where(User.email == DEMO_EMAIL)
        )
        old_user = result.scalar_one_or_none()
        if old_user:
            # Update firebase_uid to the new project's UID
            await session.execute(
                update(User)
                .where(User.email == DEMO_EMAIL)
                .values(firebase_uid=DEMO_FIREBASE_UID)
            )
            await session.commit()
            print(f"[DB] Updated firebase_uid for {DEMO_EMAIL} → {DEMO_FIREBASE_UID}")
            return

        # Fresh insert
        org = Organization(name=ORG_NAME)
        session.add(org)
        await session.flush()

        user = User(
            id=uuid.uuid4(),
            org_id=org.id,
            firebase_uid=DEMO_FIREBASE_UID,
            email=DEMO_EMAIL,
            name=DEMO_NAME,
            specialization="Implantology",
            country="India",
        )
        session.add(user)
        await session.commit()
        print(f"[DB] Created demo user: {user.id}")

    print("\nDone! Demo credentials:")
    print(f"  Email:    {DEMO_EMAIL}")
    print(f"  Password: doctor123")


if __name__ == "__main__":
    asyncio.run(main())
