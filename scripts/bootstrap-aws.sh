#!/usr/bin/env bash
# bootstrap-aws.sh — One-time AWS setup for DentalHub (run after: aws configure)
# Creates: S3 bucket, lifecycle policy, IAM user, access key → writes to backend/.env

set -euo pipefail

BUCKET="osioloc-cases-prod"
REGION="ap-south-1"
IAM_USER="osioloc-backend"
ENV_FILE="$(dirname "$0")/../backend/.env"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/backend/.env"

echo ""
echo "=========================================="
echo " DentalHub — AWS Bootstrap"
echo "=========================================="
echo ""

# ── Preflight ─────────────────────────────────
if ! command -v aws &>/dev/null; then
  echo "[ERROR] AWS CLI not found. Install it first:"
  echo "  brew install awscli"
  exit 1
fi

if ! aws sts get-caller-identity &>/dev/null; then
  echo "[ERROR] AWS credentials not configured or invalid."
  echo "  Run: aws configure"
  exit 1
fi

echo "[1/4] Creating S3 bucket: $BUCKET in $REGION"
# Bucket creation (idempotent — skip if already exists)
if aws s3api head-bucket --bucket "$BUCKET" --region "$REGION" 2>/dev/null; then
  echo "      Bucket already exists — skipping creation."
else
  aws s3api create-bucket \
    --bucket "$BUCKET" \
    --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
  echo "      Bucket created."
fi

echo "      Blocking all public access..."
aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "      Enabling versioning..."
aws s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

echo "      Done."

# ── Lifecycle policy ───────────────────────────
echo ""
echo "[2/4] Applying S3 lifecycle policy..."

cat > /tmp/osioloc-lifecycle.json <<'LIFECYCLE'
{
  "Rules": [
    {
      "ID": "cases-tiering",
      "Status": "Enabled",
      "Filter": { "Prefix": "cases/" },
      "Transitions": [
        { "Days": 90,  "StorageClass": "STANDARD_IA" },
        { "Days": 365, "StorageClass": "GLACIER_IR" }
      ]
    },
    {
      "ID": "thumbnails-tiering",
      "Status": "Enabled",
      "Filter": { "Prefix": "thumbnails/" },
      "Transitions": [
        { "Days": 180, "StorageClass": "STANDARD_IA" }
      ]
    }
  ]
}
LIFECYCLE

aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET" \
  --lifecycle-configuration file:///tmp/osioloc-lifecycle.json

rm /tmp/osioloc-lifecycle.json
echo "      Lifecycle policy applied."

# ── IAM user + policy ─────────────────────────
echo ""
echo "[3/4] Creating IAM user: $IAM_USER"

if aws iam get-user --user-name "$IAM_USER" &>/dev/null; then
  echo "      IAM user already exists — skipping creation."
else
  aws iam create-user --user-name "$IAM_USER"
  echo "      IAM user created."
fi

cat > /tmp/osioloc-s3-policy.json <<POLICY
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
      "Resource": "arn:aws:s3:::${BUCKET}/*"
    }
  ]
}
POLICY

aws iam put-user-policy \
  --user-name "$IAM_USER" \
  --policy-name osioloc-s3 \
  --policy-document file:///tmp/osioloc-s3-policy.json

rm /tmp/osioloc-s3-policy.json
echo "      Inline policy attached."

# ── Access key → backend/.env ─────────────────
echo ""
echo "[4/4] Creating access key and writing to backend/.env..."

# Check if key already present in .env to avoid duplicates
if [ -f "$ENV_FILE" ] && grep -q "AWS_ACCESS_KEY_ID=" "$ENV_FILE"; then
  echo "      [WARN] AWS_ACCESS_KEY_ID already exists in backend/.env — skipping key creation."
  echo "      Delete the existing AWS_ lines from backend/.env and re-run if you need a new key."
else
  aws iam create-access-key --user-name "$IAM_USER" > /tmp/ak.json

  ACCESS_KEY_ID=$(python3 -c "import json; print(json.load(open('/tmp/ak.json'))['AccessKey']['AccessKeyId'])")
  SECRET_ACCESS_KEY=$(python3 -c "import json; print(json.load(open('/tmp/ak.json'))['AccessKey']['SecretAccessKey'])")

  rm /tmp/ak.json

  touch "$ENV_FILE"
  {
    echo "AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID"
    echo "AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY"
    echo "AWS_S3_BUCKET_NAME=$BUCKET"
    echo "AWS_REGION=$REGION"
  } >> "$ENV_FILE"

  echo "      Keys written to backend/.env"
fi

echo ""
echo "=========================================="
echo " AWS setup complete!"
echo " Bucket : s3://$BUCKET  ($REGION)"
echo " IAM    : $IAM_USER"
echo " Env    : backend/.env updated"
echo "=========================================="
