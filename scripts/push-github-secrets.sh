#!/usr/bin/env bash
# push-github-secrets.sh — Push backend/.env values as GitHub repo secrets
# Usage: bash scripts/push-github-secrets.sh [--env-file path/to/.env]
# Prereq: gh auth login (already done if gh is configured)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/backend/.env"

# Allow --env-file flag
if [[ "${1:-}" == "--env-file" ]] && [[ -n "${2:-}" ]]; then
  ENV_FILE="$2"
fi

echo ""
echo "=========================================="
echo " DentalHub — Push .env → GitHub Secrets"
echo " Source : $ENV_FILE"
echo "=========================================="
echo ""

if ! command -v gh &>/dev/null; then
  echo "[ERROR] GitHub CLI not found. Install: brew install gh"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "[ERROR] Not authenticated with GitHub CLI. Run: gh auth login"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] Env file not found: $ENV_FILE"
  exit 1
fi

# Detect current repo from git remote
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
  echo "[ERROR] Could not detect GitHub repo. Ensure you're inside a git repo with a GitHub remote."
  exit 1
fi
echo " Repo   : $REPO"
echo ""

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

  echo "  Setting secret: $KEY"
  gh secret set "$KEY" --body "$VALUE" --repo "$REPO"
  ((COUNT++)) || true
done < "$ENV_FILE"

echo ""
echo "=========================================="
echo " GitHub secrets synced: $COUNT set, $SKIPPED skipped"
echo " View at: https://github.com/$REPO/settings/secrets/actions"
echo "=========================================="
