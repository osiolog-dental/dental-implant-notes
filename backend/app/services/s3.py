from __future__ import annotations

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}

# Presigned URLs are valid for 5 minutes for uploads, 1 hour for downloads
_UPLOAD_EXPIRY = 300
_DOWNLOAD_EXPIRY = 3600


def _client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def generate_upload_url(s3_key: str, content_type: str) -> str:
    """
    Return a presigned PUT URL the frontend uses to upload directly to S3.
    The backend never touches the image bytes on the upload path.
    """
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"Content type not allowed: {content_type}")

    client = _client()
    url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.AWS_S3_BUCKET_NAME,
            "Key": s3_key,
            "ContentType": content_type,
        },
        ExpiresIn=_UPLOAD_EXPIRY,
    )
    return url


def generate_download_url(s3_key: str) -> str:
    """Return a presigned GET URL valid for 1 hour."""
    client = _client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_S3_BUCKET_NAME, "Key": s3_key},
        ExpiresIn=_DOWNLOAD_EXPIRY,
    )


def download_object(s3_key: str) -> bytes:
    """Download an object from S3 and return its bytes."""
    client = _client()
    response = client.get_object(Bucket=settings.AWS_S3_BUCKET_NAME, Key=s3_key)
    return response["Body"].read()


def upload_object(s3_key: str, data: bytes, content_type: str) -> None:
    """Upload raw bytes directly to S3 (used for server-side uploads)."""
    client = _client()
    client.put_object(
        Bucket=settings.AWS_S3_BUCKET_NAME,
        Key=s3_key,
        Body=data,
        ContentType=content_type,
    )


def delete_object(s3_key: str) -> None:
    """Delete a single object from S3. Silently ignores if key does not exist."""
    client = _client()
    try:
        client.delete_object(Bucket=settings.AWS_S3_BUCKET_NAME, Key=s3_key)
    except ClientError as e:
        if e.response["Error"]["Code"] != "NoSuchKey":
            raise


def original_key(case_id: str, image_id: str, ext: str) -> str:
    return f"cases/{case_id}/{image_id}.{ext}"


def thumbnail_key(case_id: str, image_id: str) -> str:
    return f"thumbnails/{case_id}/{image_id}.jpg"
