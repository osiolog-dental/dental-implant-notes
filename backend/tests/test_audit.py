"""Audit logging tests: verify audit rows are written on key actions."""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditEvent

AUTH = {"Authorization": "Bearer fake-token"}

PATIENT_BODY = {
    "name": "Audit Patient", "age": 30, "gender": "male",
    "phone": None, "email": None, "address": None, "medical_history": None,
}


@pytest.mark.asyncio
async def test_create_patient_writes_audit_row(client: AsyncClient, registered_user):
    resp = await client.post("/api/patients", json=PATIENT_BODY, headers=AUTH)
    assert resp.status_code == 201
    patient_id = resp.json()["id"]

    from tests.conftest import _TestSessionLocal
    async with _TestSessionLocal() as db:
        result = await db.execute(
            select(AuditEvent).where(
                AuditEvent.entity_type == "patient",
                AuditEvent.entity_id == patient_id,
                AuditEvent.action == "create",
            )
        )
        event = result.scalar_one_or_none()
    assert event is not None, "Expected an audit row for patient create"


@pytest.mark.asyncio
async def test_delete_patient_writes_audit_row(client: AsyncClient, registered_user):
    resp = await client.post("/api/patients", json=PATIENT_BODY, headers=AUTH)
    patient_id = resp.json()["id"]

    await client.delete(f"/api/patients/{patient_id}", headers=AUTH)

    from tests.conftest import _TestSessionLocal
    async with _TestSessionLocal() as db:
        result = await db.execute(
            select(AuditEvent).where(
                AuditEvent.entity_type == "patient",
                AuditEvent.entity_id == patient_id,
                AuditEvent.action == "delete",
            )
        )
        assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_audit_endpoint_returns_events(client: AsyncClient, registered_user):
    await client.post("/api/patients", json=PATIENT_BODY, headers=AUTH)

    resp = await client.get("/api/audit", headers=AUTH)
    assert resp.status_code == 200
    events = resp.json()
    assert len(events) >= 1
    assert any(e["entity_type"] == "patient" for e in events)
