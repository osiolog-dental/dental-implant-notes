# Photo Vault Upload Fix — Session Log (2026-05-01)

## Problem
Images failed to upload in the Patient Photo Vault. The browser XHR PUT to S3 was returning a 400 error.

## Root Causes Found (3 separate issues)

### 1. S3 bucket did not exist
The bucket `dentalhub-clinical-images` had never been created in AWS. It needed to be set up manually.

### 2. boto3 was generating global-endpoint presigned URLs
`boto3` was signing presigned PUT URLs using `s3.amazonaws.com` (the global endpoint) instead of the regional endpoint `s3.ap-south-1.amazonaws.com`. AWS rejected these with:
> "the region 'ap-south-1' is wrong; expecting 'us-east-1'"

Fix: pass `endpoint_url` explicitly when creating the boto3 S3 client.

### 3. IAM user had no S3 permissions
The `osioloc-backend` IAM user had no `s3:PutObject`, `s3:GetObject`, or `s3:DeleteObject` permissions on the new bucket.

---

## Code Changes

### File: `backend/app/services/s3.py`

**What changed:** Added `endpoint_url` to the `_client()` function to force boto3 to use the correct regional S3 endpoint.

```python
# BEFORE
def _client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )

# AFTER
def _client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        endpoint_url=f"https://s3.{settings.AWS_REGION}.amazonaws.com",
    )
```

---

### File: `backend/app/api/routes/cases.py`

**What changed:** The `complete_upload` route creates its own inline boto3 client to upload thumbnails. Added `endpoint_url` there too.

```python
# BEFORE
s3_client = boto3.client(
    "s3",
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
)

# AFTER
s3_client = boto3.client(
    "s3",
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    endpoint_url=f"https://s3.{settings.AWS_REGION}.amazonaws.com",
)
```

---

## AWS Setup Done (Manual Steps in AWS Console)

### 1. S3 Bucket Created
- **Bucket name:** `dentalhub-clinical-images`
- **Region:** `ap-south-1` (Asia Pacific — Mumbai)
- **Public access:** Blocked (all 4 settings ON)
- **Versioning:** Disabled
- **Object Lock:** Disabled
- **Encryption:** SSE-S3 (default)

### 2. S3 CORS Policy (set on the bucket → Permissions tab)
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["http://localhost:3000", "https://app.osiolog.com"],
    "ExposeHeaders": []
  }
]
```

### 3. IAM Inline Policy on `osioloc-backend` user
**Policy name:** `dentalhub-s3-access`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::dentalhub-clinical-images/*"
    }
  ]
}
```

---

## Verification
After all changes above, a full upload test returned:
- Step 1 (presigned URL): OK
- Step 2 (S3 PUT): 200 OK
- Step 3 (/complete — thumbnail + DB mark): status = "uploaded"

Photo Vault uploads now work correctly in the browser.
