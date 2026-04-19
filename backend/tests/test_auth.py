"""Auth endpoint tests: register, /me, invalid token, missing token."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

AUTH = {"Authorization": "Bearer fake-token"}


@pytest.mark.asyncio
async def test_register_creates_user(client: AsyncClient):
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
    assert resp.status_code in (200, 201)
    data = resp.json()
    assert data["email"] == client._test_email
    assert data["name"] == "Doctor A"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_is_idempotent(client: AsyncClient, registered_user):
    """Calling register twice with the same Firebase UID returns the same user."""
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
    assert resp.status_code in (200, 201)
    assert resp.json()["id"] == registered_user["id"]


@pytest.mark.asyncio
async def test_me_returns_profile(client: AsyncClient, registered_user):
    resp = await client.get("/api/auth/me", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json()["email"] == client._test_email


@pytest.mark.asyncio
async def test_me_missing_token(client: AsyncClient):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_invalid_token(client: AsyncClient):
    from unittest.mock import patch
    with patch("app.api.deps.verify_id_token", side_effect=Exception("invalid")), \
         patch("app.api.routes.auth.verify_id_token", side_effect=Exception("invalid")):
        resp = await client.get("/api/auth/me", headers=AUTH)
    assert resp.status_code == 401
