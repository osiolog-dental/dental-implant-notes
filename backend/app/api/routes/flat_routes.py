"""
Flat-URL aliases used by the PatientDetails frontend.

These mirror the nested routes but accept patient_id as a query param
or body field, and return _id aliases in the JSON for MongoDB compat.
Also includes: warranty-image upload, patient photos, edit-log, PUT for
implants and fpd-records, and patient profile-picture upload.
"""
from __future__ import annotations

import asyncio
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.audit import AuditEvent
from app.models.case import CaseImage
from app.models.fpd import ProstheticFPD
from app.models.implant import Implant
from app.models.patient import Patient
from app.models.user import User
from app.repositories.fpd import FPDRepository
from app.repositories.implant import ImplantRepository
from app.schemas.fpd import FPDFlatCreate, FPDRead, FPDUpdate
from app.schemas.implant import ImplantFlatCreate, ImplantRead, ImplantUpdate
from app.services import s3 as s3_service

router = APIRouter(tags=["flat-routes"])


# ── /api/implants  ─────────────────────────────────────────────────────────────

@router.get("/implants", response_model=list[ImplantRead])
async def list_implants_flat(
    patient_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ImplantRead]:
    repo = ImplantRepository(db)
    implants = await repo.list_by_patient(patient_id, current_user.org_id)
    return [ImplantRead.model_validate(i) for i in implants]


@router.post("/implants", response_model=ImplantRead, status_code=201)
async def create_implant_flat(
    body: ImplantFlatCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImplantRead:
    from app.schemas.implant import ImplantCreate as IC
    data = IC(case_id=None, **body.model_dump())  # type: ignore[arg-type]
    implant = Implant(id=uuid.uuid4(), **data.model_dump())
    db.add(implant)
    await db.flush()
    return ImplantRead.model_validate(implant)


@router.put("/implants/{implant_id}", response_model=ImplantRead)
async def update_implant_flat(
    implant_id: uuid.UUID,
    body: ImplantUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImplantRead:
    repo = ImplantRepository(db)
    implant = await repo.get(implant_id, current_user.org_id)
    if not implant:
        raise HTTPException(status_code=404, detail="Implant not found")
    implant = await repo.update(implant, body)
    return ImplantRead.model_validate(implant)


# ── /api/fpd-records  ──────────────────────────────────────────────────────────

@router.get("/fpd-records", response_model=list[FPDRead])
async def list_fpd_flat(
    patient_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FPDRead]:
    repo = FPDRepository(db)
    records = await repo.list_by_patient(patient_id, current_user.org_id)
    return [FPDRead.model_validate(r) for r in records]


@router.post("/fpd-records", response_model=FPDRead, status_code=201)
async def create_fpd_flat(
    body: FPDFlatCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FPDRead:
    fpd = ProstheticFPD(
        id=uuid.uuid4(),
        case_id=None,
        patient_id=body.patient_id,
        tooth_numbers=body.tooth_numbers,
        prosthetic_loading_date=body.prosthetic_loading_date,
        crown_count=None,
        connected_implant_ids=body.connected_implant_ids,
        crown_type=body.crown_type,
        material=body.material,
        crown_material=body.crown_material,
        clinical_notes=body.clinical_notes,
        consultant_prosthodontist=body.consultant_prosthodontist,
        lab_name=body.lab_name,
    )
    db.add(fpd)
    await db.flush()
    return FPDRead.model_validate(fpd)


@router.put("/fpd-records/{fpd_id}", response_model=FPDRead)
async def update_fpd_flat(
    fpd_id: uuid.UUID,
    body: FPDUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FPDRead:
    repo = FPDRepository(db)
    fpd = await repo.get(fpd_id, current_user.org_id)
    if not fpd:
        raise HTTPException(status_code=404, detail="FPD record not found")
    fpd = await repo.update(fpd, body)
    return FPDRead.model_validate(fpd)


@router.post("/fpd-records/{fpd_id}/warranty-image")
async def upload_warranty_image(
    fpd_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = FPDRepository(db)
    fpd = await repo.get(fpd_id, current_user.org_id)
    if not fpd:
        raise HTTPException(status_code=404, detail="FPD record not found")

    content_type = file.content_type or "application/octet-stream"
    if content_type not in s3_service.ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {content_type}")

    ext = content_type.split("/")[-1].replace("jpeg", "jpg")
    s3_key = f"warranty/{current_user.org_id}/{fpd_id}.{ext}"

    image_bytes = await file.read()
    await asyncio.to_thread(s3_service.upload_object, s3_key, image_bytes, content_type)

    fpd.warranty_image_url = s3_key
    db.add(fpd)
    await db.flush()

    download_url = s3_service.generate_download_url(s3_key)
    return {"warranty_image_url": download_url}


# ── Patient photos (for PDF export)  ──────────────────────────────────────────

@router.get("/patients/{patient_id}/photos")
async def list_patient_photos(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    patient_result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.org_id == current_user.org_id,
            Patient.deleted_at.is_(None),
        )
    )
    patient = patient_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    from app.models.case import Case
    result = await db.execute(
        select(CaseImage)
        .join(Case, CaseImage.case_id == Case.id)
        .where(
            Case.patient_id == patient_id,
            CaseImage.status == "uploaded",
        )
        .order_by(CaseImage.uploaded_at.desc())
        .limit(20)
    )
    images = result.scalars().all()

    photos = []
    for img in images:
        try:
            url = s3_service.generate_download_url(img.s3_key)
            photos.append({"url": url, "content_type": img.content_type, "uploaded_at": img.uploaded_at.isoformat()})
        except Exception:
            continue
    return photos


# ── Patient edit log  ──────────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/edit-log")
async def get_patient_edit_log(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(AuditEvent)
        .where(
            AuditEvent.org_id == current_user.org_id,
            AuditEvent.entity_id == str(patient_id),
        )
        .order_by(AuditEvent.created_at.desc())
        .limit(50)
    )
    events = result.scalars().all()
    return [
        {
            "action": e.action,
            "entity_type": e.entity_type,
            "created_at": e.created_at.isoformat(),
            "user_id": str(e.user_id),
        }
        for e in events
    ]


# ── Patient PUT (friend's frontend uses PUT, not PATCH)  ──────────────────────

@router.put("/patients/{patient_id}")
async def update_patient_put(
    patient_id: uuid.UUID,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.repositories.patient import PatientRepository
    from app.schemas.patient import PatientUpdate
    repo = PatientRepository(db)
    patient = await repo.get(patient_id, current_user.org_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    allowed = {"name", "age", "gender", "phone", "email", "address", "medical_history",
               "alternate_email", "emergency_phone"}
    for k, v in body.items():
        if k in allowed:
            setattr(patient, k, v)
    db.add(patient)
    await db.flush()
    return {"id": str(patient.id), "name": patient.name, "_id": str(patient.id)}


# ── Patient profile picture  ──────────────────────────────────────────────────

@router.post("/patients/{patient_id}/profile-picture")
async def upload_patient_profile_picture(
    patient_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    patient_result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.org_id == current_user.org_id,
            Patient.deleted_at.is_(None),
        )
    )
    patient = patient_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    content_type = file.content_type or "image/jpeg"
    ext = content_type.split("/")[-1].replace("jpeg", "jpg")
    s3_key = f"patients/{current_user.org_id}/{patient_id}/profile.{ext}"

    image_bytes = await file.read()
    await asyncio.to_thread(s3_service.upload_object, s3_key, image_bytes, content_type)

    url = s3_service.generate_download_url(s3_key)
    return {"profile_picture_url": url}
