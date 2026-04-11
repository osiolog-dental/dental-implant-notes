# DentalHub — Claude Code Guide

## What This App Is
**DentalHub** is a full-stack dental implant case management system for dentists and implantologists. It allows doctors to register, manage patients, log detailed implant procedures using the FDI dental chart, track osseointegration timelines, and store patient radiographs/photos.

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
| Backend | FastAPI, Python, Motor (async MongoDB driver) |
| Database | MongoDB |
| Auth | JWT — httpOnly cookies; access token 15min, refresh token 7 days |
| Storage | Emergent Object Storage (via `EMERGENT_LLM_KEY`) for photo uploads |
| Testing | `pytest` for backend, `test_result.md` protocol for agent coordination |

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
# Backend
cd backend && uvicorn server:app --reload --port 8001

# Frontend
cd frontend && yarn start    # runs on port 3000 via CRACO
```

### Environment variables needed
- `MONGO_URL` — MongoDB connection string
- `DB_NAME` — Database name
- `JWT_SECRET` — JWT signing secret
- `EMERGENT_LLM_KEY` — Emergent Object Storage key (photo uploads)

### After any backend code change — REQUIRED
After completing any change to `backend/server.py` or any other backend file that requires a server restart:
1. Re-run the backend server: `cd backend && uvicorn server:app --reload --port 8001`
2. Re-run the frontend if not already running: `cd frontend && yarn start`
3. Open the app in the browser and verify the affected feature works before reporting the task as complete.

**Do NOT consider a backend task done until the server has been restarted and the app has been opened and verified.**

### Testing protocol
- Read `test_result.md` before running tests — it tracks task status and agent communication
- All interactive elements need `data-testid` for the testing agent to find them
- Backend tests are in `backend_test.py`

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
- Start both servers (backend on `:8001`, frontend on `:3000`).
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
- Never drop, wipe, or bulk-delete MongoDB collections or documents without explicit user instruction.
- Never reset user accounts or overwrite doctor data during testing.
- Use the test account (`midhilesh.krishna@gmail.com`) for all dev/test operations — never use or invent other accounts.

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
- The JWT cookie flow is the app's security backbone. Never change cookie settings, token expiry, or the `/api/auth/me` route behavior without explicit instruction.
- After any backend change near auth routes, re-test login → access a protected page → logout → confirm redirect.

### 12. Keep the Codebase Clean
- Do not leave `console.log` statements, commented-out dead code, or `TODO` comments in committed code unless they are tracked in the backlog.
- Do not install new npm packages or Python libraries without mentioning it to the user and confirming it fits the existing stack.
- Do not add duplicate routes, duplicate components, or duplicate utility functions — search first.
