#!/usr/bin/env bash
# bootstrap-firebase.sh — One-time Firebase setup for DentalHub
# Usage:
#   bash scripts/bootstrap-firebase.sh            ← first run (create project + web app)
#   bash scripts/bootstrap-firebase.sh --continue ← after downloading service account JSON

set -euo pipefail

PROJECT_ID="osioloc-prod"
APP_DISPLAY_NAME="osioloc-web"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_ENV="$REPO_ROOT/frontend/.env.local"
BACKEND_ENV="$REPO_ROOT/backend/.env"
SA_FILE="$REPO_ROOT/backend/firebase-service-account.json"

echo ""
echo "=========================================="
echo " DentalHub — Firebase Bootstrap"
echo "=========================================="
echo ""

# ── Preflight ─────────────────────────────────
if ! command -v firebase &>/dev/null; then
  echo "[ERROR] Firebase CLI not found. Install it first:"
  echo "  npm install -g firebase-tools"
  exit 1
fi

if ! firebase projects:list &>/dev/null; then
  echo "[ERROR] Not logged in to Firebase. Run: firebase login"
  exit 1
fi

# ── --continue path ───────────────────────────
if [[ "${1:-}" == "--continue" ]]; then
  echo "[continue] Verifying service account file..."

  if [ ! -f "$SA_FILE" ]; then
    echo "[ERROR] File not found: backend/firebase-service-account.json"
    echo "  Download it from:"
    echo "  https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk"
    exit 1
  fi

  # Verify it's valid JSON with the right project
  if ! python3 -c "import json; d=json.load(open('$SA_FILE')); assert d.get('project_id')=='$PROJECT_ID'" 2>/dev/null; then
    echo "[ERROR] Service account JSON is invalid or belongs to the wrong project."
    echo "  Expected project_id: $PROJECT_ID"
    exit 1
  fi

  # Avoid duplicate keys in backend/.env
  touch "$BACKEND_ENV"
  if grep -q "FIREBASE_PROJECT_ID=" "$BACKEND_ENV"; then
    echo "      [WARN] FIREBASE_PROJECT_ID already exists in backend/.env — skipping."
  else
    {
      echo "FIREBASE_PROJECT_ID=$PROJECT_ID"
      echo "FIREBASE_SERVICE_ACCOUNT_JSON=./firebase-service-account.json"
    } >> "$BACKEND_ENV"
    echo "      Firebase vars written to backend/.env"
  fi

  echo ""
  echo "=========================================="
  echo " Firebase setup complete!"
  echo " Project : $PROJECT_ID"
  echo " SA file : backend/firebase-service-account.json"
  echo " Env     : backend/.env updated"
  echo "=========================================="
  exit 0
fi

# ── Step 1: Create Firebase project ───────────
echo "[1/3] Creating Firebase project: $PROJECT_ID"

if firebase projects:list 2>/dev/null | grep -q "$PROJECT_ID"; then
  echo "      Project already exists — skipping creation."
else
  firebase projects:create "$PROJECT_ID" --display-name "DentalHub"
  echo "      Project created."
fi

# ── Step 2: Create web app + write .env.local ─
echo ""
echo "[2/3] Creating Firebase web app..."

# Create the web app; capture the app ID from output
APP_CREATE_OUTPUT=$(firebase apps:create WEB "$APP_DISPLAY_NAME" --project "$PROJECT_ID" 2>&1)
echo "$APP_CREATE_OUTPUT"

# Extract App ID (format: 1:XXXXXXXXXX:web:YYYYYYYY)
APP_ID=$(echo "$APP_CREATE_OUTPUT" | grep -oE '1:[0-9]+:web:[a-f0-9]+' | head -1)

if [ -z "$APP_ID" ]; then
  echo "[WARN] Could not auto-detect App ID from output above."
  echo "  Run manually to get SDK config:"
  echo "  firebase apps:sdkconfig WEB <app-id> --project $PROJECT_ID"
else
  echo "      App ID: $APP_ID"
  echo "      Fetching SDK config..."

  SDK_OUTPUT=$(firebase apps:sdkconfig WEB "$APP_ID" --project "$PROJECT_ID" 2>&1)

  # Parse individual fields from the JS config object firebase prints
  extract() {
    echo "$SDK_OUTPUT" | grep -oE "\"$1\": *\"[^\"]+\"" | head -1 | sed 's/.*": *"\(.*\)"/\1/'
  }

  API_KEY=$(extract "apiKey")
  AUTH_DOMAIN=$(extract "authDomain")
  PROJECT_ID_VAL=$(extract "projectId")
  STORAGE_BUCKET=$(extract "storageBucket")
  MESSAGING_SENDER_ID=$(extract "messagingSenderId")
  APP_ID_VAL=$(extract "appId")

  touch "$FRONTEND_ENV"
  {
    echo "REACT_APP_FIREBASE_API_KEY=$API_KEY"
    echo "REACT_APP_FIREBASE_AUTH_DOMAIN=${AUTH_DOMAIN:-$PROJECT_ID.firebaseapp.com}"
    echo "REACT_APP_FIREBASE_PROJECT_ID=${PROJECT_ID_VAL:-$PROJECT_ID}"
    echo "REACT_APP_FIREBASE_STORAGE_BUCKET=${STORAGE_BUCKET:-$PROJECT_ID.appspot.com}"
    echo "REACT_APP_FIREBASE_MESSAGING_SENDER_ID=$MESSAGING_SENDER_ID"
    echo "REACT_APP_FIREBASE_APP_ID=$APP_ID_VAL"
  } > "$FRONTEND_ENV"

  echo "      Config written to frontend/.env.local"
fi

# ── Step 3: Manual step notice ────────────────
echo ""
echo "[3/3] Service account — one manual step required."
echo ""
echo "========================================"
echo "MANUAL STEP REQUIRED — takes 1 minute:"
echo ""
echo "1. Open this URL in your browser:"
echo "   https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk"
echo ""
echo "2. Click 'Generate new private key'"
echo ""
echo "3. Save the downloaded file as:"
echo "   backend/firebase-service-account.json"
echo ""
echo "4. Then run:"
echo "   bash scripts/bootstrap-firebase.sh --continue"
echo "========================================"
