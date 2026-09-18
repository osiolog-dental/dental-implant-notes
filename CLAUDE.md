# Osiolog — Claude Code Guide

## What This App Is
**Osiolog** (formerly DentalHub) is a full-stack dental implant case management system for dentists and implantologists. It ships as a web app AND native iOS + Android app via Capacitor.

---

## RULE 0 — ASK BEFORE YOU BUILD (OVERRIDES EVERYTHING BELOW)

**Never assume. Never infer. Never guess what the user meant.**

This rule outranks every other rule in this file. If any other instruction appears to permit proceeding on an assumption, this rule wins.

### The gate

| Request type | What to do |
|---|---|
| A question ("what does this do?", "why is login failing?", "where is X?") | **Answer it directly.** No gate. Reading, searching, and explaining are free. |
| Anything that writes, edits, installs, deletes, migrates, deploys, or commits | **STOP. Ask first.** Do not touch a file until the answer comes back. |

### Before any change, the following must be explicitly confirmed — not inferred

1. **Scope** — which screens, files, endpoints, and platforms (web / Android / iOS) are in play?
2. **Behaviour** — what exactly should happen, in the dentist's own words?
3. **Data** — which DB fields are read or written? Is anything new being stored?
4. **Edge cases** — what should happen when the value is empty, zero, missing, or wrong?
5. **Blast radius** — does this touch `PatientDetails.js`, auth, patient records, or production?

If any of the five is unclear, **ask before writing a single line**. Use `AskUserQuestion` with concrete options — never a vague "what would you like?".

### How to ask well

- Ask **specific, answerable** questions with real options and their trade-offs spelled out.
- Present the clinical/practical consequence of each option, not the technical one.
- Batch related questions into one round. Do not interrogate one question at a time.
- If you have a recommendation, say so and say why — the user is a clinician, not an engineer.

### Absolutely forbidden without an explicit answer

- Inventing a field name, DB column, endpoint, or default value.
- Choosing a number (a threshold, a limit, a day count, a price) the user did not state.
- Deciding "the user probably meant X" and building X.
- Filling a gap in a spec with a plausible guess.
- Expanding scope beyond what was literally asked.

### The one exception

If the user has **already answered** the relevant question earlier in the same conversation, do not ask it again. Re-asking settled questions is its own failure. Carry the answer forward.

> **Why this rule exists:** the user is a practising implantologist, not a software engineer. A wrong assumption does not surface as a compiler error — it surfaces as wrong clinical data in a real patient record, sometimes months later. A thirty-second question is always cheaper than a silent wrong guess.

---

## Agent & Skill Routing — Who Works On What

Three skill libraries are installed globally at `C:\Users\midhi\.claude\skills\`:

| Library | What it is | Naming |
|---|---|---|
| **gstack** (Garry Tan) | 54 skills modelling a full engineering team — CEO, designer, engineer, QA lead, shipper | `gstack-*` |
| **karpathy-guidelines** | Behavioural rules that cut common LLM coding mistakes | `karpathy-guidelines` |
| **Anthropic Cybersecurity Skills** | 813 practitioner security workflows across 34 domains | long descriptive names |

### Always active, every single task

- **`karpathy-guidelines`** — think before coding, simplest thing that works, surgical diffs, verifiable success criteria. This pairs directly with Rule 0.

### Route by what is being touched

| Area of work | Dispatch a subagent with | Why |
|---|---|---|
| **React pages, UI, layout, styling** | `gstack-design-review`, `gstack-design-consultation`, plus `design_guidelines.json` | Design-system compliance is Rule 3 and is easy to violate by eye |
| **`PatientDetails.js` (any edit at all)** | `gstack-careful` + a dedicated subagent | Rule 7 — this file is large and fragile; it gets its own isolated context |
| **FastAPI routes, Pydantic models, SQLAlchemy** | `gstack-plan-eng-review`, then `gstack-review` | Backend changes ripple into migrations and the mobile clients |
| **Auth, Firebase, JWT, `AuthContext.js`** | Security skills + `gstack-careful` | Rule 11 — auth breakage locks the dentist out of their own records |
| **Patient data, S3 uploads, Photo Vault** | Security skills for access control and data protection | This is real patient health data with real privacy obligations |
| **Capacitor, Android, iOS builds** | `gstack-ios-qa`, `gstack-ios-fix`, `gstack-ios-sync` | The Capacitor rules below are non-obvious and fail silently |
| **Debugging something broken** | `gstack-investigate` | Find the root cause before proposing a fix |
| **Planning a feature** | `Plan` agent or `gstack-autoplan` / `gstack-spec` | Produces a reviewable plan before any code exists |
| **Finding code across the repo** | `Explore` agent | Cheap, parallel, keeps the main context clean |
| **Before shipping** | `/code-review`, `gstack-qa`, `gstack-ship` | Last gate before production |

### How dispatch works

- Route **automatically** — the user should not have to name a role.
- **State which role is working** before dispatching, in one short line.
- Dispatch subagents **in parallel** when the areas are independent (e.g. a frontend change and an unrelated backend change).
- Subagents are briefed, not trusted blindly: **always verify their actual diffs** before reporting work as done.
- A subagent inherits Rule 0. If it hits an ambiguity, it stops and reports back — it does not guess.

### Security skill selection

With 813 security skills available, pick by relevance, not by reflex. The ones that actually apply to Osiolog concern web application security, cloud and S3 access control, authentication and session handling, and health-data privacy. Ignore the malware-analysis, ICS/SCADA, and forensics domains — they have no bearing on this app.

### Maintaining the libraries (Windows)

On Windows these skills are installed as **file copies, not symlinks**. A `git pull` in the source repo therefore does **not** update what Claude Code loads.

```bash
# gstack — after any git pull, re-run setup or the skills stay stale
cd ~/.claude/skills/gstack && git pull && ./setup --host claude --prefix

# security skills — re-copy from the vendor clone
cd ~/.claude/vendor/Anthropic-Cybersecurity-Skills && git pull
cp -r skills/. ~/.claude/skills/

# karpathy guidelines — single skill, re-copy the one folder
cd ~/.claude/vendor/andrej-karpathy-skills && git pull
cp -r skills/karpathy-guidelines ~/.claude/skills/

# always verify the count afterwards — a partial copy fails silently
find ~/.claude/skills -maxdepth 2 -name SKILL.md | wc -l   # expect 870
```

**Restart required.** Claude Code reads the skill registry once, at session start. Newly installed or updated skills do **not** appear in a session that was already running — verified by invoking one immediately after install and getting `Unknown skill`. After any install or refresh, restart Claude Code (in VS Code: reload the window).

Five security skills are permanently absent (Windows Defender blocks them) — this is expected and documented in [`docs/FAILURES.md`](docs/FAILURES.md). gstack also registered a `Stop` hook in `~/.claude/settings.json`; it is tagged `_gstack_source` and removable via `gstack-settings-hook remove-source`.

---

## Decision & Implementation Documentation — MANDATORY

This project follows [`UNIVERSAL PROJECT DECISION & IMPLEMENTATION DOCUMENTATION RULE.md`](UNIVERSAL%20PROJECT%20DECISION%20&%20IMPLEMENTATION%20DOCUMENTATION%20RULE.md). Read it before documenting anything substantial. The core of it:

> Never document only the final answer. Document the **path that led to it** — what was tried, what failed, what was rejected and why.

### Two living logs

| File | Holds |
|---|---|
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Every meaningful decision: the problem, the alternatives, why one won, what was traded away |
| [`docs/FAILURES.md`](docs/FAILURES.md) | Every meaningful failure: what was expected, what happened, root cause, fix, lesson |

### When an entry is required

Write one for: architecture changes, new dependencies, schema changes, auth or security decisions, anything touching patient data, a changed approach mid-task, and any bug that cost real time to diagnose.

Do **not** write one for: typo fixes, copy tweaks, formatting, or a one-line change with no alternatives worth weighing. Rule 24 of the standard is explicit that documentation must be proportional — bloat is its own failure.

### Non-negotiable honesty requirements

- **Never invent reasoning after the fact.** If the original rationale cannot be recovered, write exactly that, then label any reconstruction as such.
- **Never claim an alternative was tested if it was not.** Write "not experimentally evaluated; rejected because …".
- **Separate observed fact from interpretation from assumption.** Never blur the three.
- **State uncertainty plainly** — verified / supported by evidence / engineering judgement / assumed / unknown.
- **Supersede, don't delete.** When a decision is reversed, mark the old entry superseded and keep it. The history is the point.

---

## Architecture

```
dental-implant-notes/
├── backend/
│   ├── app/
│   │   ├── main.py             ← FastAPI app factory, CORS, router registration
│   │   ├── core/               ← config.py, firebase.py (token verify), plans.py, exceptions.py
│   │   ├── api/
│   │   │   ├── deps.py         ← Auth dependency — resolves Firebase token → User row
│   │   │   └── routes/         ← One module per domain (patients, implants, fpd,
│   │   │                          cases, clinics, financial, inventory, storage, …)
│   │   ├── models/             ← SQLAlchemy ORM tables
│   │   ├── schemas/            ← Pydantic request/response models
│   │   ├── repositories/       ← DB query layer (keeps routes thin)
│   │   └── services/           ← s3.py, google_drive.py, email.py, chat.py,
│   │                              notifications.py, thumbnail.py, audit.py
│   ├── alembic/versions/       ← Schema migrations — never edit an applied one
│   ├── tests/                  ← pytest suite (conftest.py builds isolated doctors)
│   ├── start.sh                ← Prod entrypoint: alembic upgrade head → uvicorn
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js                    ← Router config (React Router v7)
│   │   ├── api/client.js             ← ⚠️ THE ONLY place axios is allowed (Rule 13)
│   │   ├── contexts/
│   │   │   ├── AuthContext.js        ← Firebase auth state (login, logout, me)
│   │   │   ├── LocaleContext.js      ← Country + currency formatting
│   │   │   └── PricingContext.js     ← Material cost/price list
│   │   ├── components/               ← Layout, ProtectedRoute, DentalChart,
│   │   │                                and one *FormModal / *RecordsSection pair
│   │   │                                per clinical record type
│   │   │   └── ui/                   ← Only the 6 Shadcn primitives actually used
│   │   │                                (button, dialog, input, label, avatar,
│   │   │                                 dropdown-menu). Toasts use `sonner`.
│   │   └── pages/                    ← Dashboard, Patients, PatientDetails ⚠️ LARGE FILE,
│   │                                    MedicalVault, Analytics, Clinics, Account,
│   │                                    Stock, Subscription, Admin, Backup, Landing, …
│   ├── android/ · ios/     ← Capacitor native projects (the real ones — no copies at repo root)
│   ├── package.json        ← React 19, Shadcn (Radix), Tailwind, CRACO — yarn is the package manager
│   └── craco.config.js     ← Custom webpack via CRACO (not Vite/Next.js)
├── design_guidelines.json  ← Design tokens: colors, fonts, spacing, component specs
├── render.yaml             ← Render deploy config (autoDeploy on push to main)
├── memory/PRD.md           ← Product Requirements Document
└── test_result.md          ← Testing protocol log (read before running tests)
```

> **Backend layering:** a request flows `routes → repositories → models`, with
> `schemas` validating in and out and `services` wrapping external systems (S3,
> Drive, Resend, Anthropic, FCM). Put new DB queries in a repository, not a route.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7, Tailwind CSS v3, Shadcn UI (Radix), CRACO |
| Icons | `@phosphor-icons/react` |
| Charts | `recharts` |
| Forms | Plain controlled React state — `react-hook-form`/`zod` are in `package.json` but unused |
| Toasts | `sonner` (**not** the Shadcn/Radix toast — that stack was removed as dead) |
| Backend | FastAPI, Python, SQLAlchemy async, Alembic |
| Database | PostgreSQL (`osioloc_dev` locally — legacy name, see below) |
| Auth | Firebase Authentication (email/password + Google) |
| Storage | AWS S3 (ap-south-1) — presigned URLs, Pillow thumbnails |
| Mobile | Capacitor 8 → iOS + Android |
| Testing | `pytest` for backend |

### Brand name — "Osiolog" everywhere, with four deliberate exceptions

The product went DentalHub → Osioloc → **Osiolog**. All docs, code, logger names,
UI strings and the native app IDs now say **Osiolog** (`com.osiolog.app`, matching
the `osiolog-prod` Firebase registration).

Four `osioloc` names are **kept on purpose** because they name live resources that
cannot be renamed in place. Do not "fix" these — doing so points config at things
that do not exist:

| Name | What it is |
|---|---|
| `osioloc-cases-prod` | S3 bucket holding every patient image. Bucket names are immutable; renaming means creating a new bucket and copying all clinical data. |
| `osioloc-db.…rds.amazonaws.com` | RDS instance hostname |
| `osioloc-backend` | IAM user used by the backend |
| `osioloc_dev` | Your local dev Postgres database |

If you ever migrate those resources, update this table in the same change.

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
POST /api/auth/register          ← Doctor signup (requires name, email in body + Firebase token)
GET  /api/auth/me                ← Current user (Firebase token → upserts user row)

GET  /api/patients               ← Doctor-scoped patient list
POST /api/patients
GET  /api/patients/:id
PATCH/DELETE /api/patients/:id
GET  /api/patients/:id/fpd       ← FPD records for a patient
GET  /api/patients/:id/implants  ← Implants for a patient
GET  /api/patients/:id/photos    ← Photo vault for a patient

GET  /api/cases                  ← Case list (filterable by patient_id)
POST /api/cases
GET/PATCH/DELETE /api/cases/:id

GET  /api/implants               ← Implant logs (filterable by patient_id)
POST /api/implants               ← Requires both patient_id AND case_id in body
GET/PATCH/DELETE /api/implants/:id

GET  /api/fpd-records            ← FPD records list
POST /api/fpd-records            ← Requires patient_id (case_id optional)
PUT  /api/fpd-records/:id

POST /api/cases/:id/images/upload-url   ← Step 1: get presigned S3 PUT URL
POST /api/cases/:id/images/:id/complete ← Step 2: mark upload done, generate thumbnail
GET  /api/cases/:id/images              ← List images for a case
DELETE /api/cases/:id/images/:id        ← Delete image from S3 + DB

GET  /api/dashboard/summary      ← { total_patients, active_cases, cases_this_month, upcoming_followups }

GET  /api/clinics
POST /api/clinics
GET/PATCH/DELETE /api/clinics/:id

PATCH /api/users/me              ← Update doctor profile (college, place, bio, etc.)
DELETE /api/users/me             ← Delete account (requires auth)

POST /api/notifications/device-token   ← Register FCM token
DELETE /api/notifications/device-token ← Unregister FCM token
```

---

## Database Schema (PostgreSQL)

```
users:     { org_id, firebase_uid, email, name, phone, country, registration_number,
             college, college_place, place, specialization, profile_picture_key,
             bio, gender, date_of_birth, designation, organization, years_of_experience,
             address_street, address_city, address_state, address_zip,
             primary_clinic, consulting_clinics, clinical_focus,
             education[jsonb], publications[jsonb] }
           ↑ No password column — auth is Firebase-only; `firebase_uid` is the link.
             Clinics are their own table (FK to user), not an array on this row.

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
- [x] FPD log sheet backend endpoints (`POST /api/fpd-records`)
- [x] Profile update endpoint (`PATCH /api/users/me`)
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

### First-time setup (after cloning)

```bash
# 1. Copy the env file — all production values are already filled in
cp frontend/.env.example frontend/.env.local

# 2. Install frontend dependencies
cd frontend && npm install

# 3. That's it — the app points to the production AWS backend automatically.
#    No local Python/backend setup needed unless you're changing backend code.
```

### Running locally

```bash
# Backend — only needed if you are changing backend code
# Replace the virtualenv path with your own if different
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
adb shell am start -n com.osiolog.app/.MainActivity

# iOS (simulator)
node_modules/.bin/cap sync ios
open ios/App/App.xcodeproj   # Run from Xcode
```

### Environment variables needed
- `DATABASE_URL` — PostgreSQL: `postgresql+asyncpg://localhost/osioloc_dev`
- `FIREBASE_PROJECT_ID` — Firebase project: `osiolog-prod`
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
  - Test tooling lives in `backend/requirements-dev.txt` (kept out of `requirements.txt`
    so Render does not install it in production):
    `.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt`
  - **The suite needs a running local PostgreSQL.** `conftest.py` connects to
    `settings.DATABASE_URL` (`osioloc_dev` by default). With Postgres down, every
    DB-backed test fails with `ConnectionRefusedError` — that is an environment
    problem, not a code regression. Only the 3 non-DB tests pass in that state.
- Demo account: `doctor@dentalapp.com` / `doctor123`

---

## Active User (dev/test)
- Email: `midhilesh.krishna@gmail.com`

---

## Engineering Standards — Non-Negotiable Rules

These rules exist because the primary user is non-technical. Every task must meet these standards without being asked. Think of them as the quality bar that separates "it runs" from "it's production-ready."

**Rule 0 at the top of this file outranks all eighteen rules below.** Where any rule here could be read as permission to proceed on an assumption, it is not — ask first.

Two of the eighteen govern how you talk to the user rather than how you write code, and they are not optional: **Rule 10** (report finished work in plain language) and **Rule 18** (when the user has to perform a technical step themselves, write it so they can actually follow it).

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

### 13. All Frontend API Calls MUST Use `client.js` — Never Raw Axios

This is a hard rule with zero exceptions for any file that makes authenticated API calls.

**The only correct way to call the backend from the frontend:**
```js
import client from '../api/client';  // adjust relative path as needed

// GET
const res = await client.get('/api/patients');

// POST
const res = await client.post('/api/implants', payload);

// PATCH / PUT / DELETE
await client.patch('/api/users/me', data);
await client.delete('/api/cases/123');
```

**Never do this:**
```js
// ❌ WRONG — no Firebase token, gets 401 in production
import axios from 'axios';
const API_URL = process.env.REACT_APP_BACKEND_URL;
axios.get(`${API_URL}/api/patients`, { withCredentials: true });

// ❌ WRONG — same problem
fetch(`${API_URL}/api/patients`, { credentials: 'include' });
```

**Why:** The backend requires a Firebase Bearer token on every request. `client.js` has an axios interceptor that automatically fetches the current Firebase ID token and attaches it as `Authorization: Bearer <token>` before every request. Raw `axios` and `fetch` have no such interceptor — every call gets 401, which the user sees as "Failed to fetch" or a blank page.

**Before finishing any frontend task, run this check:**
```bash
grep -rn "import axios from 'axios'\|withCredentials\|credentials: 'include'" frontend/src/ --include="*.js"
```
The only file that should appear is `frontend/src/api/client.js` itself. If any other file appears, fix it before committing.

### 14. Production Environment Checklist — Run Before Every Commit

Before marking any task done, verify these against the **live production app** (`https://osiolog.com` / `https://api.osiolog.com`):

**Backend changes:**
- [ ] `curl https://api.osiolog.com/api/health` returns `{"status":"ok","db":"ok"}`
- [ ] The new/changed endpoint returns the expected response with a real Firebase token (not localhost)
- [ ] No unintended 500s on related endpoints

**Frontend changes:**
- [ ] Run: `grep -rn "import axios from 'axios'\|withCredentials" frontend/src/ --include="*.js"` → only `client.js` appears
- [ ] Run: `grep -rn "localhost:8002\|localhost:3000" frontend/src/ --include="*.js"` → zero results (no hardcoded local URLs)
- [ ] Firebase config points to `osiolog-prod` (not `osioloc-prod` or any other project)
- [ ] All new interactive elements have `data-testid` attributes

**Auth sanity:**
- [ ] Get a real token: `curl -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDIU1K6wogiRx8KTogouocRrV0-KyAGr_s" -H "Content-Type: application/json" -d '{"email":"doctor@dentalapp.com","password":"doctor123","returnSecureToken":true}'`
- [ ] Use that token to hit the new endpoint — confirm 200, not 401/403/500

**CI/CD:**
- [ ] Deploys are **Render**, not GitHub Actions — there is no `.github/workflows/`,
      so `gh run list` will show nothing. `render.yaml` sets `autoDeploy: true`, so
      pushing to `main` triggers the backend deploy automatically.
- [ ] Confirm the deploy went out by re-running the health check above and checking
      the Render dashboard's Events tab.

### 15. Clarify Before Building — See Rule 0

No code, no config, no install, no migration until scope, behaviour, data, edge cases, and blast radius are confirmed by the user. Questions get answered directly; changes get gated. Full rule at the top of this file.

### 16. Route Work To The Right Role — See Agent & Skill Routing

Frontend work goes to the design roles, backend to the engineering roles, anything touching auth or patient data additionally to the security skills, and `PatientDetails.js` always gets its own isolated subagent. Announce the role, dispatch automatically, verify the diff yourself before reporting done.

### 17. Document The Reasoning, Not Just The Result

Meaningful decisions go in `docs/DECISIONS.md`; meaningful failures go in `docs/FAILURES.md`. Record the alternatives and why they lost, not just what was built. Never retrofit a tidy rationale onto a decision whose real reasoning is unknown — say it is unknown. Proportional: skip it for typos and copy tweaks.

### 18. Write So The User Can Actually Do It — HARD RULE

The user is a practising implantologist, not a software engineer. They can do any technical task — **if** it is explained in a way that assumes no prior knowledge. Rule 10 governs how you *report* finished work. This rule governs every moment you ask them to *do* something.

**First: don't hand over work you can do yourself.** If a tool available to you can complete the step, complete it. Only give the user a task when it genuinely requires them — a browser login, a password, a payment, a phone or a physical device, an account setting behind a dashboard, or a decision only they can make.

**When they must do it, the instructions must be followable by someone who has never opened a terminal.**

- **Numbered steps, in order, nothing skipped.** No step may quietly contain three steps.
- **Say where they are.** Name the window or app first — VS Code, Chrome, Command Prompt, the phone. Never assume they know where a command is typed.
- **One command per line, ready to copy.** Never chain commands with `&&` and leave them to untangle it. Never wrap a command in prose they have to extract.
- **Say what success looks like.** What should appear on screen when it worked? Give the actual expected text.
- **Say what to do if it fails.** A step with no failure path is a dead end.
- **Warn before, not after.** If a step is irreversible, destructive, or costs money, say so in the step *before* it.
- **Explain each unavoidable technical word the first time it appears**, in the same sentence — not in a glossary they have to go find.

**Banned words and phrases**, because each one hides the part that is actually hard: *just*, *simply*, *obviously*, *of course*, *as you know*, *straightforward*, *trivial*, *should be easy*.

**Never leave an instruction abstract.** Compare:

| ❌ Not an instruction | ✅ An instruction |
|---|---|
| "Revoke the token." | "1. Open `github.com/settings/tokens` in your browser. 2. Find the row named … 3. Click **Delete**. 4. Confirm. The row disappears — that means it worked." |
| "Reload the window." | "In VS Code, press `Ctrl+Shift+P`, type `Reload Window`, press Enter. The screen blanks for a second, then comes back." |
| "Review the changes before committing." | "Run this one command: `git status`. It lists every changed file. Read the list and tell me if anything looks unfamiliar — I'll explain each one." |

**When the user asks what something means, answer the question they asked**, at the level they asked it — no lecture, no assumed background. The question "commit means push to github?" was asked because those two words had never been separated for them. That is the level to pitch at, and it is never something to apologise for or talk down about.

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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
