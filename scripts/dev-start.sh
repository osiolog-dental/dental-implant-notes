#!/usr/bin/env bash
# dev-start.sh — Start the full Osioloc dev environment in one command.
# Usage: bash scripts/dev-start.sh [--android]
#
# Without flags: starts backend + frontend web dev server
# With --android: also sets up adb reverse tunnel for the Android emulator

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="/Users/rithvikgolthi/.local/share/virtualenvs/FARM-Stack-Course-master-xwgx4Xfc/bin/activate"
ADB="$HOME/Library/Android/sdk/platform-tools/adb"

echo "=== Osioloc Dev Startup ==="

# ── Backend ────────────────────────────────────────────────────────────────
echo "→ Starting backend on port 8002 (0.0.0.0)..."
pkill -f "uvicorn app.main:app" 2>/dev/null || true
sleep 1
source "$VENV"
cd "$REPO_ROOT/backend"
python3 -m uvicorn app.main:app --reload --port 8002 --host 0.0.0.0 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Wait for backend to be ready
for i in $(seq 1 10); do
  if curl -sf http://localhost:8002/api/health > /dev/null 2>&1; then
    echo "  Backend ready ✓"
    break
  fi
  sleep 1
done

# ── Android adb reverse (optional) ────────────────────────────────────────
if [[ "$1" == "--android" ]]; then
  if "$ADB" devices 2>/dev/null | grep -q "emulator\|device"; then
    "$ADB" reverse tcp:8002 tcp:8002 && echo "→ adb reverse tcp:8002 OK ✓"
  else
    echo "  [warn] No Android emulator connected — skipping adb reverse"
  fi
fi

# ── Frontend ───────────────────────────────────────────────────────────────
echo "→ Starting frontend on port 3000..."
cd "$REPO_ROOT/frontend"
NODE_OPTIONS=--openssl-legacy-provider npx craco start &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "=== Dev environment running ==="
echo "  Web:     http://localhost:3000"
echo "  API:     http://localhost:8002/api/docs"
echo "  Stop:    kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "  Android (after emulator boot):"
echo "    adb reverse tcp:8002 tcp:8002"
echo ""

wait
