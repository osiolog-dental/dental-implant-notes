"""
Tenant isolation: org B cannot read/modify org A data.
Each test registers two independent doctors in the same DB but different orgs,
then verifies cross-org access is blocked.
"""
from __future__ import annotations

import uuid
from contextlib import ExitStack
from unittest.mock import patch

import pytest
from httpx import AsyncClient

AUTH = {"Authorization": "Bearer fake-token"}


def _patch_uid(uid: str, email: str):
    fake = {"uid": uid, "email": email}
    return ExitStack().__enter__()  # placeholder — see helper below


def _verify_patch(uid: str, email: str):
    fake = {"uid": uid, "email": email}
    patches = [
        patch("app.api.deps.verify_id_token", return_value=fake),
        patch("app.api.routes.auth.verify_id_token", return_value=fake),
    ]
    stack = ExitStack()
    for p in patches:
        stack.enter_context(p)
    return stack


async def _register(client: AsyncClient, uid: str, email: str) -> dict:
    with _verify_patch(uid, email):
        resp = await client.post(
            "/api/auth/register",
            json={"name": f"Doctor {uid[:6]}", "email": email, "phone": None,
                  "country": "India", "registration_number": "X",
                  "college": None, "specialization": None, "place": None},
            headers=AUTH,
        )
    assert resp.status_code in (200, 201), resp.text
    return resp.json()


async def _create_patient(client: AsyncClient, uid: str, email: str) -> dict:
    with _verify_patch(uid, email):
        resp = await client.post(
            "/api/patients",
            json={"name": "Patient A", "age": 40, "gender": "male",
                  "phone": None, "email": None, "address": None, "medical_history": None},
            headers=AUTH,
        )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_org_b_cannot_read_org_a_patient(client: AsyncClient):
    uid_a = f"uid-a-{uuid.uuid4().hex}"
    uid_b = f"uid-b-{uuid.uuid4().hex}"
    email_a = f"doca-{uuid.uuid4().hex[:8]}@test.com"
    email_b = f"docb-{uuid.uuid4().hex[:8]}@test.com"

    await _register(client, uid_a, email_a)
    await _register(client, uid_b, email_b)
    patient = await _create_patient(client, uid_a, email_a)

    with _verify_patch(uid_b, email_b):
        resp = await client.get(f"/api/patients/{patient['id']}", headers=AUTH)
    assert resp.status_code in (403, 404)


@pytest.mark.asyncio
async def test_org_b_cannot_update_org_a_patient(client: AsyncClient):
    uid_a = f"uid-a-{uuid.uuid4().hex}"
    uid_b = f"uid-b-{uuid.uuid4().hex}"
    email_a = f"doca-{uuid.uuid4().hex[:8]}@test.com"
    email_b = f"docb-{uuid.uuid4().hex[:8]}@test.com"

    await _register(client, uid_a, email_a)
    await _register(client, uid_b, email_b)
    patient = await _create_patient(client, uid_a, email_a)

    with _verify_patch(uid_b, email_b):
        resp = await client.patch(
            f"/api/patients/{patient['id']}",
            json={"name": "Hacked"},
            headers=AUTH,
        )
    assert resp.status_code in (403, 404)


@pytest.mark.asyncio
async def test_org_b_cannot_delete_org_a_patient(client: AsyncClient):
    uid_a = f"uid-a-{uuid.uuid4().hex}"
    uid_b = f"uid-b-{uuid.uuid4().hex}"
    email_a = f"doca-{uuid.uuid4().hex[:8]}@test.com"
    email_b = f"docb-{uuid.uuid4().hex[:8]}@test.com"

    await _register(client, uid_a, email_a)
    await _register(client, uid_b, email_b)
    patient = await _create_patient(client, uid_a, email_a)

    with _verify_patch(uid_b, email_b):
        resp = await client.delete(f"/api/patients/{patient['id']}", headers=AUTH)
    assert resp.status_code in (403, 404)


@pytest.mark.asyncio
async def test_patient_list_scoped_to_own_org(client: AsyncClient):
    uid_a = f"uid-a-{uuid.uuid4().hex}"
    uid_b = f"uid-b-{uuid.uuid4().hex}"
    email_a = f"doca-{uuid.uuid4().hex[:8]}@test.com"
    email_b = f"docb-{uuid.uuid4().hex[:8]}@test.com"

    await _register(client, uid_a, email_a)
    await _register(client, uid_b, email_b)
    await _create_patient(client, uid_a, email_a)

    with _verify_patch(uid_b, email_b):
        resp = await client.get("/api/patients", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json() == []
