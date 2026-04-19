# Osioloc — Codex Guide

## What This App Is
**Osioloc** (formerly DentalHub) is a full-stack dental implant case management system for dentists and implantologists. It ships as a web app AND native iOS + Android app via Capacitor.

---

## Architecture

```
dental-implant-notes/
├── backend/
│   ├── server.py          ← All FastAPI routes, Pydantic models, MongoDB logic
│   └── requirements.txt   ← Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.js                    ← Router config (React Router v7)
│   │   ├── contexts/AuthContext.js   ← JWT auth state (login, logout, me)
│   │   ├── components/
│   │   │   ├── Layout.js             ← Sidebar + top header + bottom nav
│   │   │   └── ProtectedRoute.js     ← Auth guard wrapper
│   │   └── pages/
│   │       ├── Dashboard.js          ← Clinical cases, stats overview
│   │       ├── Patients.js           ← Patient list + CRUD
│   │       ├── PatientDetails.js     ← FDI chart, implant modal, FPD modal, Photo Vault ⚠️ LARGE FILE
│   │       ├── MedicalVault.js       ← Photo/radiograph gallery per patient
│   │       ├── Analytics.js          ← Charts with Recharts
│   │       ├── Clinics.js            ← Clinic management
│   │       ├── Account.js            ← Doctor profile (editable college/place)
│   │       ├── Login.js
│   │       └── Register.js
│   ├── package.json        ← React 19, Shadcn (Radix), Tailwind, CRACO
│   └── craco.config.js     ← Custom webpack via CRACO (not Vite/Next.js)
├── design_guidelines.json  ← Design tokens: colors, fonts, spacing, component specs
├── memory/PRD.md           ← Product Requirements Document
└── test_result.md          ← Testing protocol log (read before running tests)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7, Tailwind CSS v3, Shadcn UI (Radix), CRACO |
| Icons | `@phosphor-icons/react` |
| Charts | `recharts` |
| Forms | `react-hook-form` + `zod` |
| Backend | FastAPI, Python, SQLAlchemy async, Alembic |
| Database | PostgreSQL (`osioloc_dev` locally) |
| Auth | Firebase Authentication (email/password + Google) |
| Storage | AWS S3 (ap-south-1) — presigned URLs, Pillow thumbnails |
| Mobile | Capacitor 8 → iOS + Android |
| Testing | `pytest` for backend |

---

## Design System (from `design_guidelines.json`)

- **Theme:** Light, Organic & Earthy — "Clinical Precision & Calm"
- **Brand:** `#82A098` (teal-green) / Accent: `#C27E70` (terracotta)
- **Background:** `#F9F9F8` primary, `#FFFFFF` surface
- **Text:** `#2A2F35` primary, `#5C6773` secondary
- **Border:** `#E5E5E2`
- **Fonts:** Work Sans (headings), IBM Plex Sans (body), IBM Plex Mono (mono)
- **Cards:** flat 1px border, `rounded-xl`, `shadow-sm` — no heavy drop shadows
- **Testability:** Every interactive element **MUST** have a `data-testid` attribute

---

## Key API Endpoints

```
POST /api/auth/register          ← Doctor signup
POST /api/auth/login             ← Returns JWT in httpOnly cookie
GET  /api/auth/me                ← Current user from cookie
POST /api/auth/logout

GET  /api/patients               ← Doctor-scoped patient list
POST /api/patients
GET  /api/patients/:id

GET  /api/implants               ← Implant logs per patient
POST /api/implants

GET  /api/fpd                    ← Fixed Partial Denture logs
POST /api/fpd

POST /api/upload                 ← Photo/radiograph upload → Emergent Storage
GET  /api/vault/:patient_id      ← Photo vault listing

GET  /api/analytics/overview
GET  /api/analytics/financial

GET  /api/clinics
POST /api/clinics

PATCH /api/profile               ← Update doctor college / place
```

---

## Database Schema (MongoDB)

```
users:     { email, hashed_password, name, phone, country, registration_number,
             college, specialization, profile_picture, clinics[], place }

patients:  { doctor_id, name, age, gender, phone, email, address, medical_history }

implants:  { patient_id, tooth_number, implant_type, brand, size, length,
             insertion_torque, connection_type, surgical_approach,
             bone_graft, sinus_lift_type, is_pterygoid, is_zygomatic, is_subperiosteal,
             arch, jaw_region, implant_system, cover_screw, healing_abutment,
             membrane_used, isq_value, follow_up_date, surgeon_name,
             surgery_date, prosthetic_loading_date, implant_outcome,
             osseointegration_success, peri_implant_health, notes, clinic_id }

fpd_logs:  { patient_id, tooth_numbers[], prosthetic_loading_date,
             crown_count, connected_implant_ids[], crown_type, material, clinical_notes }

photo_vault: { patient_id, doctor_id, filename, content_type, path,
               uploaded_at, folder_date }
```

---

## Current Feature Status

### Completed
- [x] JWT Auth — register, login, logout, cookie-based sessions
- [x] Dashboard — Clinical Cases, Active Queue, stats
- [x] Patient CRUD (doctor-scoped)
- [x] FDI Dental Chart — interactive, horizontal scroll, tooth selection
- [x] Implant Tracking — full form (torque, brand, connection, grafts, sinus lifts, ISQ, follow-up)
- [x] Photo Vault — upload/browse radiographs with date-wise folders
- [x] Analytics — overview and financial charts
- [x] Clinics management
- [x] Profile header — top-right with doctor name, avatar, Account/Logout dropdown
- [x] Account page — displays all doctor details
- [x] FPD log sheet backend endpoints (`POST /api/fpd`)
- [x] Profile update endpoint (`PATCH /api/profile`)
- [x] Unified single-form implant modal (no tabs) — **code written, UI testing pending**
- [x] FPD modal UI in PatientDetails.js — **code written, UI testing pending**
- [x] Account page editable college/place — **code written, UI testing pending**

### Pending / Backlog

| Priority | Task |
|---|---|
| **P0** | UI-test the FPD modal, unified implant form, and Account college/place edit (written but untested due to platform crash) |
| **P1** | Osseointegration day counter + 90-day reminder on Dashboard/PatientDetails |
| **P2** | Financial analysis module (cost tracking per implant/patient) |
| **P2** | Refactor `PatientDetails.js` — extract FPD modal + Implant modal into separate components |
| **P3** | PDF/Excel export of implant data |
| **P3** | Push notifications for osseointegration milestones |

---

## Known Issues & Warnings

### PatientDetails.js — FRAGILE LARGE FILE
`frontend/src/pages/PatientDetails.js` handles the FDI chart, patient info, Photo Vault navigation, Implant Modal, and FPD Modal all in one file. It is very large and prone to JSX nesting errors when edited. **Do not add more logic here.** The fix is to extract `ImplantModal` and `FPDModal` into separate component files.

### Untested Code from Last Session
The following features were fully coded but never visually tested (the session was interrupted by a platform infrastructure crash):
- Unified single-scroll implant form in `PatientDetails.js`
- FPD Log Sheet modal in `PatientDetails.js`
- Editable college/place fields in `Account.js`

**Before adding any new features: start the servers, navigate to a patient page, and verify these work.**

---

## Development Workflow

### Running locally

```bash
# Backend — MUST use --host 0.0.0.0 so Android emulator can reach it via 10.0.2.2
cd backend
source /Users/rithvikgolthi/.local/share/virtualenvs/FARM-Stack-Course-master-xwgx4Xfc/bin/activate
python3 -m uvicorn app.main:app --reload --port 8002 --host 0.0.0.0

# Frontend (web)
cd frontend && NODE_OPTIONS=--openssl-legacy-provider npx craco start

# Android (after web dev server OR after craco build)
# One-time per emulator boot — sets up localhost tunnel:
adb reverse tcp:8002 tcp:8002
# Build + install:
NODE_OPTIONS=--openssl-legacy-provider npx craco build
node_modules/.bin/cap sync android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.osioloc.app/.MainActivity

# iOS (simulator)
node_modules/.bin/cap sync ios
open ios/App/App.xcodeproj   # Run from Xcode
```

### Environment variables needed
- `DATABASE_URL` — PostgreSQL: `postgresql+asyncpg://localhost/osioloc_dev`
- `FIREBASE_PROJECT_ID` — Firebase project: `osioloc-prod`
- `FIREBASE_SERVICE_ACCOUNT_JSON` — Path to service account JSON
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_REGION` — S3
- Frontend `.env.local`: `REACT_APP_FIREBASE_*` keys, `REACT_APP_BACKEND_URL=http://localhost:8002`

### After any backend code change — REQUIRED
1. Kill the old uvicorn: `pkill -f "uvicorn app.main:app"`
2. Restart: `python3 -m uvicorn app.main:app --reload --port 8002 --host 0.0.0.0`
3. Verify: `curl http://localhost:8002/api/health`

**Do NOT consider a backend task done until the server has been restarted and curl returns `{"status":"ok"}`.**

### Testing protocol
- All interactive elements need `data-testid` for automated testing
- Backend tests: `pytest backend/tests/`
- Demo account: `doctor@dentalapp.com` / `doctor123`

---

## Active User (dev/test)
- Email: `midhilesh.krishna@gmail.com`

---

## Engineering Standards — Non-Negotiable Rules

These rules exist because the primary user is non-technical. Every task must meet these standards without being asked. Think of them as the quality bar that separates "it runs" from "it's production-ready."

---

### 1. Always Read Before Touching
- Before editing ANY file, read the relevant section first. Never guess at existing code.
- Before adding a new API endpoint, read the full `server.py` to check for conflicts, existing patterns, and naming conventions.
- Before editing a React page, read the component's current state — especially `PatientDetails.js` which changes frequently.

### 2. Full Vertical Slice — No Half-Done Work
Every feature must be complete end-to-end before being called done:
- Backend route → Pydantic model → DB write/read → Frontend API call → UI render → Visual verification
- If a task only touches one layer, explicitly verify the other layers still work (regression check).
- Never leave a feature partially wired (e.g., backend done but frontend not calling it).

### 3. Design System Compliance — Always
- Before writing any UI component, check `design_guidelines.json` for the correct color tokens, font, spacing, and border-radius values.
- Brand color: `#82A098` (teal-green). Accent: `#C27E70` (terracotta). Background: `#F9F9F8`. Never hardcode colors that deviate.
- All cards: `rounded-xl`, `shadow-sm`, flat `1px` border using `#E5E5E2`. No heavy drop shadows.
- Fonts: `Work Sans` for headings, `IBM Plex Sans` for body text.
- Every new interactive element (button, input, modal, link) **MUST** have a `data-testid` attribute.

### 4. Errors Must Be Visible to the User
- Every API call in the frontend must have a `.catch()` or `try/catch` block that shows an error message in the UI (toast, alert, or inline error text) — never fail silently.
- Backend route errors must return meaningful HTTP status codes and `detail` messages, not bare 500s.
- If a form submission fails, the form must stay filled in (don't reset on error).

### 5. UI Verification After Every Change — REQUIRED
This applies to frontend AND backend changes:
- Start both servers (backend on `:8002`, frontend on `:3000`).
- Navigate to the affected page and click through the feature.
- Test the happy path (normal use) AND at least one edge case (empty state, invalid input, missing data).
- Do not report a task complete based on code review alone — visual confirmation is required.

### 6. Regression Awareness
- When editing a shared file (`Layout.js`, `AuthContext.js`, `server.py`), check all pages/routes that depend on it.
- After any routing change in `App.js`, verify that login → dashboard → patient detail navigation still works.
- After any auth change, verify that protected routes still redirect unauthenticated users.

### 7. PatientDetails.js — Handle With Extreme Care
- This file is LARGE and FRAGILE. Any JSX nesting error will break the entire patient detail view.
- Do not add new state, new modals, or new logic directly into this file.
- New modals or panels must be extracted into separate component files under `frontend/src/components/`.
- After any edit to this file: check that the FDI chart renders, the implant modal opens, and the photo vault tab loads.

### 8. Data Safety — Never Destructive Without Confirmation
- Never drop, wipe, or bulk-delete PostgreSQL tables or rows without explicit user instruction.
- Never reset user accounts or overwrite doctor data during testing.
- Use the demo account (`doctor@dentalapp.com`) for all dev/test operations — never use or invent other accounts.

### 9. Interpret Vague Requests Clinically
The user is a domain expert in dentistry but not in software. When a request is ambiguous:
- Interpret it in the richest, most clinically useful way that fits the existing data model.
- Example: "add a note field" → add it to the right DB schema, surface it in both the form and the detail view, and make it optional.
- If something could go two ways, pick the approach that matches how dentists actually work, and note the choice.

### 10. Report Back Clearly — Non-Technical Language
After completing any task, summarize:
- What was changed and where (file names, not line numbers).
- What the user should now be able to do in the app.
- Any known limitations or next steps.
- Do NOT use jargon like "I refactored the state management" — say "I fixed the save button in the implant form so it no longer clears your entries on error."

### 11. Never Break Auth
- Auth is Firebase + PostgreSQL. Never change Firebase config, token verification, or `/api/auth/me` behavior without explicit instruction.
- After any backend change near auth routes, re-test login → access a protected page → logout → confirm redirect.
- The `loading` state in AuthContext is critical — it gates ProtectedRoute. Never remove or shortcut it.

### 12. Keep the Codebase Clean
- Do not leave `console.log` statements, commented-out dead code, or `TODO` comments in committed code unless they are tracked in the backlog.
- Do not install new npm packages or Python libraries without mentioning it to the user and confirming it fits the existing stack.
- Do not add duplicate routes, duplicate components, or duplicate utility functions — search first.

---

## Capacitor Multi-Platform Rules (NON-NEGOTIABLE)

These rules exist because getting Capacitor to work correctly across web, Android, and iOS has specific non-obvious requirements. Violating any of these will cause silent failures.

### C1. Backend URL Routing

| Platform | API URL | Why |
|---|---|---|
| Web browser | `http://localhost:8002` | Direct, no special setup |
| Android emulator | `http://10.0.2.2:8002` | Emulator's alias for host Mac loopback |
| iOS simulator | `http://localhost:8002` | Simulator shares Mac network |
| Physical device | `http://<mac-LAN-ip>:8002` | Must be on same Wi-Fi |
| Production (all) | `https://api.yourdomain.com` | Real server HTTPS URL |

This logic lives in `frontend/src/api/client.js` and is handled automatically via `Capacitor.getPlatform()`. **Never hardcode a URL per platform in page components.**

### C2. Backend Must Bind to `0.0.0.0`

Always start uvicorn with `--host 0.0.0.0` in dev:
```bash
python3 -m uvicorn app.main:app --reload --port 8002 --host 0.0.0.0
```
Without this, Android emulator connections to `10.0.2.2:8002` are refused.

### C3. CORS Must Include All Capacitor Origins

`backend/app/main.py` allowed origins in dev:
- `http://localhost:3000` — web dev server
- `http://localhost` — Capacitor Android (http scheme, no port)
- `https://localhost` — Capacitor Android (https scheme)
- `capacitor://localhost` — Capacitor iOS (default scheme)
- `ionic://localhost` — Capacitor older versions

Never remove these. The Capacitor WebView's `Origin` header is NOT `http://localhost:3000` — it's portless.

### C4. Android HTTP Cleartext

`capacitor.config.json` must have:
```json
"server": { "androidScheme": "http", "cleartext": true },
"android": { "allowMixedContent": true }
```

`android/app/src/main/res/xml/network_security_config.xml` must allow cleartext for `10.0.2.2` and `localhost`.

`android/app/src/main/AndroidManifest.xml` must have:
```xml
android:networkSecurityConfig="@xml/network_security_config"
android:usesCleartextTraffic="true"
```

### C5. Auth Loading State Race Condition

`AuthContext.js` **must** set `loading = true` at the start of `login()` and at the start of the `onAuthStateChanged` handler when a Firebase user exists. Without this:
1. `signInWithEmailAndPassword` resolves → `login()` returns → `navigate('/')` fires
2. `onAuthStateChanged` hasn't fetched `/api/auth/me` yet
3. ProtectedRoute sees `user=false, loading=false` → redirects back to `/login`
4. Login appears to require 2–3 attempts

**Never remove or work around the `setLoading(true)` calls in AuthContext.**

### C6. After Any Capacitor-Affecting Change, Full Rebuild Is Required

Any change to: `capacitor.config.json`, `client.js`, `AuthContext.js`, `network_security_config.xml`, or `AndroidManifest.xml` requires:
```bash
NODE_OPTIONS=--openssl-legacy-provider npx craco build
node_modules/.bin/cap sync android   # or ios
# Android:
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
# iOS: re-run from Xcode
```

**Do not skip the `craco build` step** — `cap sync` copies the existing `build/` folder, it does not re-compile JS.

### C7. WebView Debugging

To inspect the Capacitor Android WebView from Chrome DevTools:
```bash
adb forward tcp:9222 localabstract:chrome_devtools_remote
# Then open: chrome://inspect in Chrome on Mac
```
`MainActivity.java` already has `WebView.setWebContentsDebuggingEnabled(true)`.

### C8. iOS Auth Domain

For `signInWithPopup` (Google), `http://localhost` must be in the Firebase Console authorized domains. For email/password login, no domain authorization is needed.

### C9. Physical Device Testing

For physical Android/iOS device testing:
1. Find Mac's LAN IP: `ipconfig getifaddr en0`
2. Set `REACT_APP_BACKEND_URL=http://<LAN-ip>:8002` in `frontend/.env.local`
3. Ensure device and Mac are on same Wi-Fi
4. Backend must be on `--host 0.0.0.0`
