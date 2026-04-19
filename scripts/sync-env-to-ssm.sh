#!/usr/bin/env bash
# sync-env-to-ssm.sh — Push backend/.env values to AWS SSM Parameter Store
# Usage: bash scripts/sync-env-to-ssm.sh [--env-file path/to/.env]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${2:-$REPO_ROOT/backend/.env}"
REGION="ap-south-1"
SSM_PREFIX="/osioloc/prod"

# Allow --env-file flag
if [[ "${1:-}" == "--env-file" ]] && [[ -n "${2:-}" ]]; then
  ENV_FILE="$2"
fi

echo ""
echo "=========================================="
echo " DentalHub — Sync .env → SSM"
echo " Source : $ENV_FILE"
echo " Prefix : $SSM_PREFIX"
echo " Region : $REGION"
echo "=========================================="
echo ""

if ! command -v aws &>/dev/null; then
  echo "[ERROR] AWS CLI not found. Install: brew install awscli"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] Env file not found: $ENV_FILE"
  exit 1
fi

COUNT=0
SKIPPED=0

while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip blank lines and comments
  [[ -z "$line" || "$line" == \#* ]] && continue

  # Must be KEY=VALUE format
  if [[ "$line" != *"="* ]]; then
    continue
  fi

  KEY="${line%%=*}"
  VALUE="${line#*=}"

  # Skip keys with empty values
  if [[ -z "$VALUE" ]]; then
    echo "  [SKIP] $KEY  (empty value)"
    ((SKIPPED++)) || true
    continue
  fi

  echo "  Syncing: $SSM_PREFIX/$KEY"
  aws ssm put-parameter \
    --name "$SSM_PREFIX/$KEY" \
    --value "$VALUE" \
    --type SecureString \
    --overwrite \
    --region "$REGION" \
    --output text \
    --query "Version" \
    | xargs -I{} echo "         → version {}"

  ((COUNT++)) || true
done < "$ENV_FILE"

echo ""
echo "=========================================="
echo " Synced $COUNT vars to SSM  (skipped $SKIPPED empty)"
echo "=========================================="
