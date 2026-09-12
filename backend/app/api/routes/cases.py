from __future__ import annotations

import asyncio
import hmac
import time
import uuid

import boto3
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.case import CaseImage
from app.models.organization import Organization
from app.models.user import User
from app.repositories.case import CaseRepository
from app.repositories.google_drive import GoogleDriveRepository
from app.schemas.case import CaseCreate, CaseImageRead, CaseRead, CaseUpdate
from app.services import google_drive as drive_service
from app.services import s3 as s3_service
from app.services import thumbnail as thumb_service
from app.services.audit import log_event

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("", response_model=list[CaseRead])
async def list_cases(
    patient_id: uuid.UUID | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CaseRead]:
    repo = CaseRepository(db)
    cases = await repo.list(current_user.org_id, patient_id=patient_id, page=page, per_page=per_page)
    return [CaseRead.model_validate(c) for c in cases]


@router.post("", response_model=CaseRead, status_code=status.HTTP_201_CREATED)
async def create_case(
    body: CaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CaseRead:
    repo = CaseRepository(db)
    case = await repo.create(current_user.id, body)
    await log_event(db, org_id=current_user.org_id, user_id=current_user.id,
                    action="create", entity_type="case", entity_id=str(case.id))
    return CaseRead.model_validate(case)


@router.get("/{case_id}", response_model=CaseRead)
async def get_case(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CaseRead:
    repo = CaseRepository(db)
    case = await repo.get(case_id, current_user.org_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseRead.model_validate(case)


@router.patch("/{case_id}", response_model=CaseRead)
async def update_case(
    case_id: uuid.UUID,
    body: CaseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CaseRead:
    repo = CaseRepository(db)
    case = await repo.get(case_id, current_user.org_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    case = await repo.update(case, body)
    return CaseRead.model_validate(case)


@router.delete("/{case_id}", status_code=status.HTTP_200_OK)
async def delete_case(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = CaseRepository(db)
    case = await repo.get(case_id, current_user.org_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    await repo.delete(case)
    await log_event(db, org_id=current_user.org_id, user_id=current_user.id,
                    action="delete", entity_type="case", entity_id=str(case_id))
    return {"deleted": True}


# ── Image endpoints ────────────────────────────────────────────────────────────

from pydantic import BaseModel  # noqa: E402

class UploadUrlRequest(BaseModel):
    content_type: str
    category: str = "general"


class UploadUrlResponse(BaseModel):
    image_id: uuid.UUID
    upload_url: str
    # 'platform': PUT the file bytes directly to upload_url (a presigned R2/S3 URL).
    # 'google_drive': POST the file as multipart form-data to upload_url instead
    # (a path on our own API) — Drive uploads must go through our server-held
    # OAuth token, so there's no external presigned URL to hand the browser.
    backend: str


@router.post("/{case_id}/images/upload-url", response_model=UploadUrlResponse)
async def request_upload_url(
    case_id: uuid.UUID,
    body: UploadUrlRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadUrlResponse:
    """
    Step 1 of upload flow. Verifies case ownership, enforces 25-image limit,
    creates a pending CaseImage row snapshotted to the org's current storage
    backend (see UploadUrlResponse.backend for what happens next).
    """
    repo = CaseRepository(db)
    case = await repo.get(case_id, current_user.org_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Enforce 25-image limit per case
    count_result = await db.execute(
        select(CaseImage).where(
            CaseImage.case_id == case_id,
            CaseImage.status == "uploaded",
        )
    )
    existing_count = len(count_result.scalars().all())
    if existing_count >= 25:
        raise HTTPException(status_code=400, detail="Maximum 25 images per case")

    if body.content_type not in s3_service.ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Content type not allowed: {body.content_type}")

    org = (await db.execute(select(Organization).where(Organization.id == current_user.org_id))).scalar_one_or_none()
    backend = org.storage_backend if org else "platform"
    image_id = uuid.uuid4()

    if backend == "google_drive":
        image_row = CaseImage(
            id=image_id,
            case_id=case_id,
            org_id=current_user.org_id,
            storage_backend="google_drive",
            content_type=body.content_type,
            category=body.category,
            status="pending",
        )
        db.add(image_row)
        await db.flush()
        return UploadUrlResponse(
            image_id=image_id,
            upload_url=f"/api/cases/{case_id}/images/{image_id}/drive-upload",
            backend="google_drive",
        )

    # Determine file extension
    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "application/pdf": "pdf",
    }
    ext = ext_map[body.content_type]
    key = s3_service.original_key(str(case_id), str(image_id), ext)

    image_row = CaseImage(
        id=image_id,
        case_id=case_id,
        org_id=current_user.org_id,
        storage_backend="platform",
        s3_key=key,
        content_type=body.content_type,
        category=body.category,
        status="pending",
    )
    db.add(image_row)
    await db.flush()

    try:
        upload_url = s3_service.generate_upload_url(key, body.content_type)
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Photo storage isn't configured on the server. Contact support.",
        )
    return UploadUrlResponse(image_id=image_id, upload_url=upload_url, backend="platform")


@router.post("/{case_id}/images/{image_id}/drive-upload", response_model=CaseImageRead)
async def drive_upload(
    case_id: uuid.UUID,
    image_id: uuid.UUID,
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CaseImageRead:
    """
    Upload path for Drive-backed orgs — the file comes straight to us
    (instead of a presigned PUT) since only we hold the OAuth token needed
    to write into the doctor's Drive. Uploads the original + a thumbnail
    and marks the row uploaded, all in this one call.
    """
    repo = CaseRepository(db)
    case = await repo.get(case_id, current_user.org_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    result = await db.execute(
        select(CaseImage).where(CaseImage.id == image_id, CaseImage.case_id == case_id)
    )
    image_row = result.scalar_one_or_none()
    if not image_row or image_row.storage_backend != "google_drive":
        raise HTTPException(status_code=404, detail="Image record not found")

    token = await GoogleDriveRepository(db).get_valid_access_token(current_user.org_id)
    if not token:
        raise HTTPException(
            status_code=503,
            detail="Google Drive isn't connected. Reconnect it from the Subscription page.",
        )
    access_token, folder_id = token

    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf"}
    ext = ext_map.get(image_row.content_type, "bin")
    data = await file.read()

    try:
        file_id = await asyncio.to_thread(
            drive_service.upload_file, access_token, folder_id, f"{image_id}.{ext}", data, image_row.content_type,
        )
        image_row.drive_file_id = file_id

        thumb_bytes = await thumb_service.generate_thumbnail(data, image_row.content_type)
        if thumb_bytes:
            thumb_file_id = await asyncio.to_thread(
                drive_service.upload_file, access_token, folder_id, f"{image_id}_thumb.jpg", thumb_bytes, "image/jpeg",
            )
            image_row.thumbnail_drive_file_id = thumb_file_id
    except drive_service.DriveStorageFullError:
        await db.delete(image_row)
        await db.flush()
        raise HTTPException(
            status_code=507,
            detail="Your Google Drive is full. Free up space or upgrade storage at drive.google.com, "
                   "or switch back to Our Storage from the Subscription page.",
        )
    except Exception:
        await db.delete(image_row)
        await db.flush()
        raise HTTPException(status_code=502, detail="Upload to Google Drive failed. Please try again.")

    image_row.status = "uploaded"
    db.add(image_row)
    await db.flush()

    return _to_image_read(image_row, request)


@router.post("/{case_id}/images/{image_id}/complete", response_model=CaseImageRead)
async def complete_upload(
    case_id: uuid.UUID,
    image_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CaseImageRead:
    """
    Step 2 of upload flow for platform (R2/S3) uploads — called after the
    frontend finishes the presigned PUT. Downloads the uploaded file,
    generates a thumbnail, stores it, marks the row as uploaded.
    Drive-backed images never reach here — /drive-upload does this in one step.
    """
    repo = CaseRepository(db)
    case = await repo.get(case_id, current_user.org_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    result = await db.execute(
        select(CaseImage).where(CaseImage.id == image_id, CaseImage.case_id == case_id)
    )
    image_row = result.scalar_one_or_none()
    if not image_row:
        raise HTTPException(status_code=404, detail="Image record not found")
    if image_row.storage_backend != "platform":
        raise HTTPException(status_code=400, detail="This image was not uploaded via the platform storage flow")

    # Download from S3, generate thumbnail, upload thumbnail — all in background thread
    try:
        image_bytes = await asyncio.to_thread(s3_service.download_object, image_row.s3_key)
        thumb_bytes = await thumb_service.generate_thumbnail(image_bytes, image_row.content_type)

        if thumb_bytes:
            t_key = s3_service.thumbnail_key(str(case_id), str(image_id))
            s3_client = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            await asyncio.to_thread(
                s3_client.put_object,
                Bucket=settings.AWS_S3_BUCKET_NAME,
                Key=t_key,
                Body=thumb_bytes,
                ContentType="image/jpeg",
            )
            image_row.thumbnail_s3_key = t_key
    except Exception:
        # Thumbnail failure is non-fatal — image is still usable
        pass

    image_row.status = "uploaded"
    db.add(image_row)
    await db.flush()

    return _to_image_read(image_row, request)


@router.get("/{case_id}/images", response_model=list[CaseImageRead])
async def list_images(
    case_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CaseImageRead]:
    """
    List all uploaded images for a case.
    Returns fresh presigned/signed URLs for both full image and thumbnail.
    Raw S3 keys and Drive file ids are never exposed.
    """
    repo = CaseRepository(db)
    case = await repo.get(case_id, current_user.org_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    result = await db.execute(
        select(CaseImage).where(
            CaseImage.case_id == case_id,
            CaseImage.status == "uploaded",
        ).order_by(CaseImage.uploaded_at.desc())
    )
    images = result.scalars().all()
    return [_to_image_read(img, request) for img in images]


@router.get("/images/{image_id}/drive-content")
async def drive_image_content(
    image_id: uuid.UUID,
    thumb: int = Query(0),
    exp: int = Query(...),
    sig: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Signature-verified, unauthenticated proxy for Drive-backed image bytes.
    <img> tags can't send an Authorization header, so this stands in for an
    S3 presigned URL: the signature (not a login session) is what proves
    the link is legitimate, same trust model as a presigned URL's signature.
    """
    if time.time() > exp:
        raise HTTPException(status_code=403, detail="This link has expired")
    if not hmac.compare_digest(sig, drive_service.sign_content(image_id, bool(thumb), exp)):
        raise HTTPException(status_code=403, detail="Invalid link")

    result = await db.execute(select(CaseImage).where(CaseImage.id == image_id))
    image_row = result.scalar_one_or_none()
    if not image_row or image_row.storage_backend != "google_drive":
        raise HTTPException(status_code=404, detail="Not found")

    file_id = image_row.thumbnail_drive_file_id if thumb else image_row.drive_file_id
    if not file_id:
        raise HTTPException(status_code=404, detail="Not found")

    token = await GoogleDriveRepository(db).get_valid_access_token(image_row.org_id)
    if not token:
        raise HTTPException(status_code=404, detail="Not found")
    access_token, _ = token

    data = await asyncio.to_thread(drive_service.download_file, access_token, file_id)
    media_type = "image/jpeg" if thumb else image_row.content_type
    return Response(content=data, media_type=media_type)


@router.delete("/{case_id}/images/{image_id}")
async def delete_image(
    case_id: uuid.UUID,
    image_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete image (original + thumbnail) from wherever it's stored, and remove DB row."""
    repo = CaseRepository(db)
    case = await repo.get(case_id, current_user.org_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    result = await db.execute(
        select(CaseImage).where(CaseImage.id == image_id, CaseImage.case_id == case_id)
    )
    image_row = result.scalar_one_or_none()
    if not image_row:
        raise HTTPException(status_code=404, detail="Image not found")

    if image_row.storage_backend == "google_drive":
        token = await GoogleDriveRepository(db).get_valid_access_token(current_user.org_id)
        if token:
            access_token, _ = token
            if image_row.drive_file_id:
                await asyncio.to_thread(drive_service.delete_file, access_token, image_row.drive_file_id)
            if image_row.thumbnail_drive_file_id:
                await asyncio.to_thread(drive_service.delete_file, access_token, image_row.thumbnail_drive_file_id)
    else:
        if image_row.s3_key:
            await asyncio.to_thread(s3_service.delete_object, image_row.s3_key)
        if image_row.thumbnail_s3_key:
            await asyncio.to_thread(s3_service.delete_object, image_row.thumbnail_s3_key)

    await db.delete(image_row)
    await db.flush()
    return {"deleted": True}


def _to_image_read(image: CaseImage, request: Request) -> CaseImageRead:
    """Convert a CaseImage ORM row to CaseImageRead, generating fresh viewable URLs."""
    if image.storage_backend == "google_drive":
        base = str(request.base_url)
        url = drive_service.content_url(base, image.id, thumb=False)
        thumbnail_url = drive_service.content_url(base, image.id, thumb=True) if image.thumbnail_drive_file_id else None
    else:
        url = s3_service.generate_download_url(image.s3_key)
        thumbnail_url = (
            s3_service.generate_download_url(image.thumbnail_s3_key)
            if image.thumbnail_s3_key
            else None
        )
    return CaseImageRead(
        id=image.id,
        case_id=image.case_id,
        content_type=image.content_type,
        category=image.category,
        status=image.status,
        uploaded_at=image.uploaded_at,
        url=url,
        thumbnail_url=thumbnail_url,
    )
