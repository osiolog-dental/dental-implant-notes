"""Case and patient CRUD tests."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

AUTH = {"Authorization": "Bearer fake-token"}

PATIENT_BODY = {
    "name": "Jane Doe", "age": 35, "gender": "female",
    "phone": None, "email": None, "address": None, "medical_history": None,
}


@pytest.mark.asyncio
async def test_create_and_get_patient(client: AsyncClient, registered_user):
    resp = await client.post("/api/patients", json=PATIENT_BODY, headers=AUTH)
    assert resp.status_code == 201
    patient = resp.json()
    assert patient["name"] == "Jane Doe"

    get_resp = await client.get(f"/api/patients/{patient['id']}", headers=AUTH)
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Jane Doe"


@pytest.mark.asyncio
async def test_update_patient(client: AsyncClient, registered_user):
    resp = await client.post("/api/patients", json=PATIENT_BODY, headers=AUTH)
    patient_id = resp.json()["id"]

    patch_resp = await client.patch(
        f"/api/patients/{patient_id}",
        json={"name": "Jane Updated"},
        headers=AUTH,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == "Jane Updated"


@pytest.mark.asyncio
async def test_delete_patient(client: AsyncClient, registered_user):
    resp = await client.post("/api/patients", json=PATIENT_BODY, headers=AUTH)
    patient_id = resp.json()["id"]

    del_resp = await client.delete(f"/api/patients/{patient_id}", headers=AUTH)
    assert del_resp.status_code == 200

    get_resp = await client.get(f"/api/patients/{patient_id}", headers=AUTH)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_create_case_for_patient(client: AsyncClient, registered_user):
    patient_resp = await client.post("/api/patients", json=PATIENT_BODY, headers=AUTH)
    patient_id = patient_resp.json()["id"]

    case_resp = await client.post(
        "/api/cases",
        json={"patient_id": patient_id, "title": "Implant Case 1", "status": "active", "notes": None},
        headers=AUTH,
    )
    assert case_resp.status_code == 201
    assert case_resp.json()["patient_id"] == patient_id


@pytest.mark.asyncio
async def test_patient_list_search(client: AsyncClient, registered_user):
    await client.post("/api/patients", json={**PATIENT_BODY, "name": "Alice Smith"}, headers=AUTH)
    await client.post("/api/patients", json={**PATIENT_BODY, "name": "Bob Jones"}, headers=AUTH)

    resp = await client.get("/api/patients?search=alice", headers=AUTH)
    assert resp.status_code == 200
    names = [p["name"] for p in resp.json()]
    assert any("Alice" in n for n in names)
    assert not any("Bob" in n for n in names)
