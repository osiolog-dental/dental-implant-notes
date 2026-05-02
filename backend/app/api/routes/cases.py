from __future__ import annotations

import asyncio
import uuid

import boto3
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.case import CaseImage
from app.models.user import User
from app.repositories.case import CaseRepository
from app.schemas.case import CaseCreate, CaseImageRead, CaseRead, CaseUpdate
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

class _UploadUrlRequest(CaseRead.__class__):
    pass

from pydantic import BaseModel  # noqa: E402

class UploadUrlRequest(BaseModel):
    content_type: str
    category: str = "general"


class UploadUrlResponse(BaseModel):
    image_id: uuid.UUID
    upload_url: str


@router.post("/{case_id}/images/upload-url", response_model=UploadUrlResponse)
async def request_upload_url(
    case_id: uuid.UUID,
    body: UploadUrlRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadUrlResponse:
    """
    Step 1 of upload flow.
    Verifies case ownership, enforces 25-image limit,
    creates a pending CaseImage row, returns a presigned PUT URL.
    Frontend uploads directly to S3 using this URL — no bytes go through our server.
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

    # Determine file extension
    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "application/pdf": "pdf",
    }
    ext = ext_map[body.content_type]
    image_id = uuid.uuid4()
    key = s3_service.original_key(str(case_id), str(image_id), ext)

    # Create pending row
    image_row = CaseImage(
        id=image_id,
        case_id=case_id,
        s3_key=key,
        content_type=body.content_type,
        category=body.category,
        status="pending",
    )
    db.add(image_row)
    await db.flush()

    upload_url = s3_service.generate_upload_url(key, body.content_type)
    return UploadUrlResponse(image_id=image_id, upload_url=upload_url)


@router.post("/{case_id}/images/{image_id}/complete", response_model=CaseImageRead)
async def complete_upload(
    case_id: uuid.UUID,
    image_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CaseImageRead:
    """
    Step 2 of upload flow — called after frontend finishes the S3 PUT.
    Downloads the uploaded file, generates a thumbnail, stores it,
    marks the row as uploaded.
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
                endpoint_url=f"https://s3.{settings.AWS_REGION}.amazonaws.com",
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

    return _to_image_read(image_row)


@router.get("/{case_id}/images", response_model=list[CaseImageRead])
async def list_images(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CaseImageRead]:
    """
    List all uploaded images for a case.
    Returns fresh presigned URLs for both full image and thumbnail.
    Raw S3 keys are never exposed.
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
    return [_to_image_read(img) for img in images]


@router.delete("/{case_id}/images/{image_id}")
async def delete_image(
    case_id: uuid.UUID,
    image_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete image from S3 (original + thumbnail) and remove DB row."""
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

    # Delete from S3 (both original and thumbnail if exists)
    await asyncio.to_thread(s3_service.delete_object, image_row.s3_key)
    if image_row.thumbnail_s3_key:
        await asyncio.to_thread(s3_service.delete_object, image_row.thumbnail_s3_key)

    await db.delete(image_row)
    await db.flush()
    return {"deleted": True}


def _to_image_read(image: CaseImage) -> CaseImageRead:
    """Convert a CaseImage ORM row to CaseImageRead, generating fresh presigned URLs."""
    return CaseImageRead(
        id=image.id,
        case_id=image.case_id,
        content_type=image.content_type,
        category=image.category,
        status=image.status,
        uploaded_at=image.uploaded_at,
        url=s3_service.generate_download_url(image.s3_key),
        thumbnail_url=(
            s3_service.generate_download_url(image.thumbnail_s3_key)
            if image.thumbnail_s3_key
            else None
        ),
    )
