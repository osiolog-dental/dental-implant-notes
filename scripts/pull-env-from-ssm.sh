#!/usr/bin/env bash
# pull-env-from-ssm.sh — Pull secrets from AWS SSM → backend/.env.prod
# Usage: bash scripts/pull-env-from-ssm.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_FILE="$REPO_ROOT/backend/.env.prod"
REGION="ap-south-1"
SSM_PREFIX="/osioloc/prod"

echo ""
echo "=========================================="
echo " DentalHub — Pull SSM → .env.prod"
echo " Prefix : $SSM_PREFIX"
echo " Region : $REGION"
echo " Output : $OUTPUT_FILE"
echo "=========================================="
echo ""

if ! command -v aws &>/dev/null; then
  echo "[ERROR] AWS CLI not found. Install: brew install awscli"
  exit 1
fi

if ! command -v python3 &>/dev/null; then
  echo "[ERROR] python3 required for JSON parsing."
  exit 1
fi

RAW_JSON=$(aws ssm get-parameters-by-path \
  --path "$SSM_PREFIX/" \
  --with-decryption \
  --recursive \
  --region "$REGION" \
  --output json)

COUNT=$(echo "$RAW_JSON" | python3 -c "
import json, sys
params = json.load(sys.stdin).get('Parameters', [])
lines = []
prefix = '$SSM_PREFIX/'
for p in params:
    key = p['Name'].replace(prefix, '', 1)
    val = p['Value']
    lines.append(f'{key}={val}')
# Write to output file
with open('$OUTPUT_FILE', 'w') as f:
    f.write('\n'.join(lines) + '\n')
print(len(lines))
")

echo " Wrote $COUNT vars to backend/.env.prod"
echo ""
echo "  To use for local testing:"
echo "    source $OUTPUT_FILE"
echo "  Or start backend with:"
echo "    env \$(cat backend/.env.prod | xargs) uvicorn app.main:app --reload"
echo ""
echo "=========================================="
echo " Done."
echo "=========================================="
