"""
Shared fixtures for the test suite.

Each test gets unique UUIDs for Firebase UIDs and emails so repeated runs
don't collide with data left in osioloc_dev from prior runs.
Firebase token verification is patched at both import locations.
"""
from __future__ import annotations

import uuid
from contextlib import ExitStack
from unittest.mock import patch

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models import *  # noqa: F401, F403

AUTH = {"Authorization": "Bearer fake-token"}

# Use NullPool so each test gets a fresh connection — no cross-loop reuse
_test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
_TestSessionLocal = async_sessionmaker(
    bind=_test_engine, class_=AsyncSession,
    expire_on_commit=False, autoflush=False, autocommit=False,
)


def _make_verify_patch(uid: str, email: str):
    fake = {"uid": uid, "email": email}

    class _MultiPatch:
        def __enter__(self):
            self._stack = ExitStack()
            self._stack.enter_context(
                patch("app.api.deps.verify_id_token", return_value=fake)
            )
            self._stack.enter_context(
                patch("app.api.routes.auth.verify_id_token", return_value=fake)
            )
            return self

        def __exit__(self, *args):
            self._stack.__exit__(*args)

    return _MultiPatch()


def _db_override():
    async def _override():
        async with _TestSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    return _override


@pytest_asyncio.fixture()
async def client():
    """AsyncClient for org A with a fresh unique Firebase UID per test."""
    uid = f"uid-a-{uuid.uuid4().hex}"
    email = f"doca-{uuid.uuid4().hex[:8]}@osioloc.com"

    app.dependency_overrides[get_db] = _db_override()
    with _make_verify_patch(uid, email):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            ac._test_uid = uid
            ac._test_email = email
            yield ac
    app.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture()
async def second_client():
    """AsyncClient for org B with a fresh unique Firebase UID per test."""
    uid = f"uid-b-{uuid.uuid4().hex}"
    email = f"docb-{uuid.uuid4().hex[:8]}@osioloc.com"

    app.dependency_overrides[get_db] = _db_override()
    with _make_verify_patch(uid, email):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            ac._test_uid = uid
            ac._test_email = email
            yield ac
    app.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture()
async def registered_user(client: AsyncClient):
    """Register org-A doctor and return profile dict."""
    resp = await client.post(
        "/api/auth/register",
        json={
            "name": "Doctor A",
            "email": client._test_email,
            "phone": None,
            "country": "India",
            "registration_number": "REG001",
            "college": None,
            "specialization": "Implantology",
            "place": None,
        },
        headers=AUTH,
    )
    assert resp.status_code in (200, 201), f"Register failed: {resp.text}"
    return resp.json()
