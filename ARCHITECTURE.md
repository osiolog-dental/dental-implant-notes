# Osiolog — Complete Architecture & Technical Reference

> **Project name:** Osiolog (formerly DentalHub)
> **Type:** Full-stack dental implant case management system
> **Platforms:** Web (React) + iOS + Android (Capacitor)
> **Last updated:** 2026-04-30
> **Status:** Local dev fully running. Production domain: `app.osiolog.com` / `api.osiolog.com`

---

## Table of Contents

1. [What This App Does](#1-what-this-app-does)
2. [Tech Stack](#2-tech-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Database Schema](#5-database-schema)
6. [Backend — FastAPI](#6-backend--fastapi)
7. [Frontend — React](#7-frontend--react)
8. [Authentication Flow](#8-authentication-flow)
9. [Image Upload Flow (S3)](#9-image-upload-flow-s3)
10. [Mobile (Capacitor)](#10-mobile-capacitor)
11. [Push Notifications (FCM)](#11-push-notifications-fcm)
12. [Design System](#12-design-system)
13. [Local Development Setup](#13-local-development-setup)
14. [Environment Variables](#14-environment-variables)
15. [API Endpoint Reference](#15-api-endpoint-reference)
16. [Key Bugs & Fixes](#16-key-bugs--fixes)
17. [gstack Workflow](#17-gstack-workflow)
18. [Deployment Notes](#18-deployment-notes)

---

## 1. What This App Does

Osiolog is a clinical case management tool built for dentists and implantologists. It replaces paper-based implant tracking with a structured digital workflow.

**Core use cases:**
- A dentist registers and logs in. They see a dashboard of all their active implant cases.
- They add a patient, then open that patient's detail page which shows an **interactive FDI dental chart** (numbered tooth diagram).
- Clicking a tooth opens a form to log an **implant** on that tooth: brand, size, diameter, torque, surgical approach, bone graft type, ISQ value, healing timeline, and more.
- The dentist can attach radiographs and clinical photos to each case via the **Photo Vault** — images upload directly to S3.
- A **90-day osseointegration countdown** reminds the dentist when implants are due for the second stage.
- Analytics show case volumes, outcomes, and financial summaries.
- The whole app runs natively on iPhone and Android via Capacitor (same codebase).

---

## 2. Tech Stack

### Backend
| Layer | Technology | Version |
|-------|-----------|---------|
| Web framework | FastAPI | 0.110.1 |
| ASGI server | Uvicorn | 0.25.0 |
| ORM | SQLAlchemy (async) | 2.0.x |
| DB driver | asyncpg | 0.29+ |
| Migrations | Alembic | 1.13+ |
| Database | PostgreSQL | 16 |
| Auth | Firebase Admin SDK + PyJWT | 6.5.0 / 2.12.1 |
| Storage | boto3 (AWS S3) | 1.34+ |
| Image processing | Pillow | 10.3+ |
| Push notifications | APScheduler + FCM v1 API | 3.10+ |
| Config | pydantic-settings | 2.2+ |
| Runtime | Python | 3.14.4 |

### Frontend
| Layer | Technology | Version |
|-------|-----------|---------|
| UI framework | React | 19 |
| Router | React Router | v7 |
| Build tool | CRACO (webpack wrapper) | — |
| Component library | Shadcn/UI (Radix UI primitives) | — |
| Styling | Tailwind CSS | v3 |
| Icons | @phosphor-icons/react | 2.1.10 |
| Charts | Recharts | 3.8.1 |
| Forms | react-hook-form + Zod | v7 / v3 |
| Toast notifications | Sonner | — |
| HTTP client | Axios (via `client.js` wrapper) | — |
| Mobile runtime | Capacitor | 8.3.1 |
| Package manager | npm | — |
| Runtime | Node.js | v24.14.1 |

### Infrastructure
| Service | Provider | Purpose |
|---------|---------|---------|
| PostgreSQL | Local (dev) / AWS Lightsail (prod) | Primary database |
| Object storage | AWS S3 `dentalhub-clinical-images` (ap-south-1) | Clinical photos |
| Authentication | Firebase (project: `osiolog-prod`) | User identity |
| Push notifications | Firebase Cloud Messaging (FCM v1) | Mobile alerts |
| Email | AWS SES (ap-south-1) | Notification emails |
| CDN/Proxy | Nginx | Reverse proxy + static files |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│                                                                     │
│  ┌──────────────────┐    ┌────────────────┐    ┌────────────────┐  │
│  │  Web Browser     │    │ Android APK    │    │  iOS IPA       │  │
│  │  localhost:3000  │    │ Capacitor 8    │    │  Capacitor 8   │  │
│  │  (React 19)      │    │ (same JS code) │    │ (same JS code) │  │
│  └────────┬─────────┘    └───────┬────────┘    └───────┬────────┘  │
│           │                      │                      │           │
│           └──────────────────────┼──────────────────────┘           │
│                                  │  HTTP/HTTPS + Bearer token       │
└──────────────────────────────────┼──────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   FastAPI Backend            │
                    │   localhost:8002 (dev)       │
                    │   api.osiolog.com (prod)     │
                    │                             │
                    │  ┌─────────────────────┐   │
                    │  │  Auth: verify_id_   │   │
                    │  │  token() via JWKS   │   │
                    │  └─────────┬───────────┘   │
                    │            │               │
                    │  ┌─────────▼───────────┐   │
                    │  │  Route handlers     │   │
                    │  │  (18 routers)       │   │
                    │  └─────────┬───────────┘   │
                    │            │               │
                    │  ┌─────────▼───────────┐   │
                    │  │  SQLAlchemy async   │   │
                    │  │  ORM + asyncpg      │   │
                    │  └─────────┬───────────┘   │
                    └────────────┼────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌────────▼─────────┐
│  PostgreSQL 16    │  │   AWS S3          │  │  Firebase        │
│  osioloc_dev (dev)│  │   ap-south-1      │  │  osiolog-prod    │
│  (all app data)   │  │   (images only)   │  │  (identity only) │
└───────────────────┘  └───────────────────┘  └──────────────────┘
```

### Request Lifecycle

```
Browser → Frontend (React)
  → client.js (axios interceptor adds Firebase Bearer token)
  → FastAPI backend
  → get_current_user() dependency
    → verify_id_token() → Google JWKS → validates JWT
    → DB lookup: SELECT user WHERE firebase_uid = ?
  → Route handler
  → SQLAlchemy → PostgreSQL
  → JSON response → React state → UI renders
```

---

## 4. Directory Structure

```
dental-implant-notes-main/
├── osiolog-frontend/               ← PRIMARY CODEBASE (use this)
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py             ← FastAPI app factory, CORS, middleware
│   │   │   ├── core/
│   │   │   │   ├── config.py       ← pydantic-settings (reads .env)
│   │   │   │   ├── firebase.py     ← verify_id_token(), Firebase Admin init
│   │   │   │   └── exceptions.py   ← NotFoundError, ForbiddenError, ConflictError
│   │   │   ├── db/
│   │   │   │   ├── base.py         ← SQLAlchemy declarative Base
│   │   │   │   └── session.py      ← get_db() async dependency
│   │   │   ├── models/             ← SQLAlchemy ORM models
│   │   │   │   ├── organization.py
│   │   │   │   ├── user.py
│   │   │   │   ├── patient.py
│   │   │   │   ├── case.py
│   │   │   │   ├── implant.py      ← 35+ fields
│   │   │   │   ├── fpd.py          ← Fixed partial dentures / prosthetics
│   │   │   │   ├── abutment.py
│   │   │   │   ├── overdenture.py
│   │   │   │   ├── clinic.py
│   │   │   │   └── audit.py        ← audit_events + device_tokens
│   │   │   ├── schemas/            ← Pydantic request/response models
│   │   │   ├── repositories/       ← Data access layer
│   │   │   ├── services/
│   │   │   │   ├── s3.py           ← Presigned URL generation, thumbnails
│   │   │   │   ├── thumbnail.py    ← Pillow image resizing
│   │   │   │   └── notifications.py← FCM v1 push + APScheduler
│   │   │   └── api/routes/
│   │   │       ├── health.py       ← GET /api/health
│   │   │       ├── auth.py         ← POST /api/auth/register, GET /api/auth/me
│   │   │       ├── users.py        ← PATCH/DELETE /api/users/me
│   │   │       ├── patients.py     ← CRUD /api/patients
│   │   │       ├── cases.py        ← CRUD /api/cases
│   │   │       ├── implants.py     ← CRUD /api/implants
│   │   │       ├── fpd.py          ← CRUD /api/fpd-records
│   │   │       ├── clinics.py      ← CRUD /api/clinics
│   │   │       ├── dashboard.py    ← GET /api/dashboard/summary
│   │   │       ├── notifications.py← POST/DELETE /api/notifications/device-token
│   │   │       ├── audit.py        ← GET /api/audit-events
│   │   │       ├── abutment.py
│   │   │       ├── overdenture.py
│   │   │       └── flat_routes.py  ← /api/implants/all, /api/implants/due-for-second-stage
│   │   ├── alembic/                ← Database migrations
│   │   │   ├── env.py              ← Loads .env via python-dotenv
│   │   │   └── versions/           ← 12 migration files
│   │   ├── alembic.ini
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   ├── .env                    ← Created during setup (not in git)
│   │   └── venv/                   ← Python virtual environment
│   │
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── App.js              ← Router config
│   │   │   ├── index.js            ← React DOM root
│   │   │   ├── contexts/
│   │   │   │   └── AuthContext.js  ← Global auth state, Firebase integration
│   │   │   ├── api/
│   │   │   │   ├── client.js       ← Axios + Firebase token interceptor (ALWAYS USE THIS)
│   │   │   │   ├── patients.js
│   │   │   │   ├── cases.js
│   │   │   │   ├── implants.js
│   │   │   │   ├── fpd.js
│   │   │   │   ├── images.js       ← S3 presigned URL + client-side compression
│   │   │   │   ├── clinics.js
│   │   │   │   └── dashboard.js
│   │   │   ├── components/
│   │   │   │   ├── Layout.js       ← Sidebar (desktop) + bottom nav (mobile)
│   │   │   │   ├── ProtectedRoute.js← Auth guard
│   │   │   │   ├── DentalChart.js  ← Interactive FDI tooth chart (canvas-based)
│   │   │   │   ├── ImplantTagScanner.js ← QR/DataMatrix barcode parser
│   │   │   │   ├── ImplantProgressTracker.js ← Osseointegration timeline
│   │   │   │   ├── PatientReportPDF.js ← html2canvas + jsPDF export
│   │   │   │   ├── BulkImport.js   ← Excel import (XLSX library)
│   │   │   │   └── ui/             ← 60+ Shadcn components
│   │   │   ├── pages/
│   │   │   │   ├── Login.js
│   │   │   │   ├── Register.js
│   │   │   │   ├── Dashboard.js    ← Case cards, stats
│   │   │   │   ├── Patients.js     ← Patient list + CRUD
│   │   │   │   ├── PatientDetails.js ← FDI chart, implant modal, FPD modal ⚠️ LARGE
│   │   │   │   ├── MedicalVault.js ← Photo gallery (S3)
│   │   │   │   ├── Analytics.js    ← Recharts
│   │   │   │   ├── Clinics.js
│   │   │   │   ├── Account.js
│   │   │   │   ├── Backup.js
│   │   │   │   ├── Subscription.js
│   │   │   │   ├── DoctorPublicProfile.js
│   │   │   │   └── PrivacyPolicy.js
│   │   │   ├── lib/
│   │   │   │   ├── firebase.js     ← Firebase app init + auth + messaging
│   │   │   │   ├── notifications.js← FCM token registration
│   │   │   │   └── utils.js
│   │   │   └── hooks/
│   │   │       └── use-toast.js
│   │   ├── public/
│   │   ├── android/                ← Capacitor Android project
│   │   ├── ios/                    ← Capacitor iOS project
│   │   ├── capacitor.config.json
│   │   ├── tailwind.config.js
│   │   ├── craco.config.js         ← Webpack overrides (Node.js openssl legacy)
│   │   ├── package.json
│   │   └── .env.local              ← Created during setup (not in git)
│   │
│   ├── CLAUDE.md                   ← Engineering rules + dev workflow
│   ├── ARCHITECTURE.md             ← This file
│   └── design_guidelines.json      ← Design system tokens
│
├── gstack/                         ← AI engineering toolkit (installed globally)
├── osiolog-prod-firebase-adminsdk-fbsvc-9add5b1cbd.json  ← Firebase service account
└── .env.example                    ← Backend env template
```

---

## 5. Database Schema

All tables use UUID primary keys. Timestamps are UTC with timezone. Soft deletes use `deleted_at` (nullable DateTime).

### Entity Relationship Diagram

```
organizations
  └── users (org_id FK, firebase_uid unique)
  └── clinics (org_id FK)
  └── invites (org_id FK)
  └── patients (org_id FK, doctor_id FK → users)
       └── cases (patient_id FK, doctor_id FK, clinic_id FK)
            └── implants (case_id FK, patient_id FK)
            └── fpd_records (case_id FK, patient_id FK)
            └── case_images (case_id FK)
            └── abutments (case_id FK)
       └── overdentures (patient_id FK)
  └── audit_events (org_id FK, user_id FK)
  └── device_tokens (user_id FK)
```

### Table Details

**organizations**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | Doctor/clinic org name |
| created_at | TIMESTAMPTZ | auto |

**users** (doctors)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| org_id | UUID FK | → organizations |
| firebase_uid | VARCHAR(128) UNIQUE | Firebase Auth UID |
| email | VARCHAR(255) UNIQUE | |
| name | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| country | VARCHAR(100) | |
| registration_number | VARCHAR(100) | Medical council number |
| college | VARCHAR(255) | Dental college |
| specialization | VARCHAR(255) | e.g. "Implantologist" |
| profile_picture_key | TEXT | S3 object key |
| place | VARCHAR(255) | City/location |
| bio | TEXT | (added in later migration) |
| created_at | TIMESTAMPTZ | auto |

**patients**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| org_id | UUID FK | Multi-tenancy scope |
| doctor_id | UUID FK | → users |
| name | VARCHAR(255) | |
| age | INTEGER | |
| gender | VARCHAR(20) | |
| phone | VARCHAR(50) | |
| email | VARCHAR(255) | |
| address | TEXT | |
| medical_history | TEXT | |
| tooth_conditions | JSONB | Per-tooth status map |
| profile_picture | TEXT | S3 key (added later) |
| deleted_at | TIMESTAMPTZ | Soft delete |
| created_at | TIMESTAMPTZ | auto |

**cases**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| patient_id | UUID FK | |
| doctor_id | UUID FK | |
| clinic_id | UUID FK | nullable |
| title | VARCHAR(255) | e.g. "Upper right implant" |
| status | VARCHAR(50) | Active / Completed / Guarded / Failed |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | auto |

**implants** (35+ fields — the core clinical record)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| case_id | UUID FK | nullable |
| patient_id | UUID FK | |
| tooth_number | INTEGER | FDI notation (11–48) |
| implant_type | VARCHAR(100) | e.g. "Tapered" |
| brand | VARCHAR(255) | e.g. "Straumann" |
| size / length | NUMERIC(6,2) | |
| diameter_mm / length_mm | NUMERIC(6,2) | |
| insertion_torque | NUMERIC(6,2) | Ncm |
| connection_type | VARCHAR(100) | e.g. "Internal Hex" |
| surgical_approach | VARCHAR(100) | Flapless / Flap |
| bone_graft | VARCHAR(255) | Graft material |
| sinus_lift_type | VARCHAR(100) | |
| is_pterygoid | BOOLEAN | Pterygoid implant flag |
| is_zygomatic | BOOLEAN | Zygomatic implant flag |
| is_subperiosteal | BOOLEAN | |
| arch | VARCHAR(50) | Upper / Lower |
| jaw_region | VARCHAR(50) | Anterior / Posterior |
| implant_system | VARCHAR(255) | Platform/system |
| cover_screw | BOOLEAN | |
| healing_abutment | BOOLEAN | |
| membrane_used | BOOLEAN | |
| isq_value | NUMERIC(5,2) | Implant Stability Quotient |
| implant_outcome | VARCHAR(100) | Success / Failure / Removed |
| osseointegration_success | BOOLEAN | |
| peri_implant_health | VARCHAR(100) | |
| surgery_date | DATE | |
| follow_up_date | DATE | Indexed for reminder queries |
| prosthetic_loading_date | DATE | |
| surgeon_name | VARCHAR(255) | |
| consultant_surgeon | VARCHAR(255) | |
| clinic_id | UUID FK | |
| notes | TEXT | |
| stage | VARCHAR(50) | Stage 1 / Stage 2 (added later) |
| stage_date | DATE | |

**fpd_records** (Fixed Partial Dentures / prosthetics)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| patient_id | UUID FK | |
| case_id | UUID FK | nullable |
| tooth_numbers | INTEGER[] | Array of teeth covered |
| prosthetic_loading_date | DATE | |
| crown_count | VARCHAR | Number of crowns |
| crown_type | VARCHAR(100) | Single / Bridge / etc. |
| material | VARCHAR(100) | Zirconia / PFM / etc. |
| clinical_notes | TEXT | |
| created_at | TIMESTAMPTZ | |

**case_images**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| case_id | UUID FK | |
| s3_key | TEXT | S3 object key |
| thumbnail_s3_key | TEXT | Thumbnail key (added in migration) |
| filename | VARCHAR(255) | Original filename |
| content_type | VARCHAR(100) | MIME type |
| category | VARCHAR(50) | general / radiograph / preop / postop |
| uploaded_at | TIMESTAMPTZ | auto |

**audit_events**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| org_id | UUID FK | |
| user_id | UUID FK | nullable (SET NULL on delete) |
| action | VARCHAR(100) | create / update / delete |
| entity_type | VARCHAR(100) | patient / implant / case / etc. |
| entity_id | VARCHAR(255) | |
| metadata | JSONB | Changed fields, old values |
| ip_address | VARCHAR(50) | |
| created_at | TIMESTAMPTZ | auto |

**device_tokens** (for FCM push)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| fcm_token | TEXT | FCM registration token |
| platform | VARCHAR(50) | android / ios / web |
| updated_at | TIMESTAMPTZ | auto-update |

---

## 6. Backend — FastAPI

### App Factory (`main.py`)

`create_app()` builds the FastAPI instance with:
- **Lifespan context**: starts APScheduler on startup for push notification jobs
- **CORS**: allows `localhost:3000` (dev), `capacitor://localhost`, `ionic://localhost`, `http://localhost`, `https://localhost`, and production domains
- **Request logging middleware**: logs every request with method, path, status code, and duration in milliseconds
- **Exception handlers**: converts custom `NotFoundError`, `ForbiddenError`, `ConflictError` to standard HTTP responses
- **18 routers** all mounted at `/api/` prefix

### Authentication Dependency (`deps.py`)

Every protected route uses `get_current_user()`:
1. Extracts `Authorization: Bearer <token>` header
2. Calls `verify_id_token(token)` — verifies against Google's JWKS with 60s clock leeway
3. Looks up `User` row by `firebase_uid`
4. Returns the ORM `User` object to the route handler

### Token Verification (`firebase.py`)

Uses PyJWT directly (not Firebase Admin SDK) for token verification:
1. Fetches Google's public JWKS from `googleapis.com` (cached 1 hour)
2. Matches the JWT `kid` header to the right public key
3. Decodes and validates: signature, audience (`osiolog-prod`), issuer, expiry
4. **`leeway=timedelta(seconds=60)`** — handles clock skew between local machine and Firebase servers

Firebase Admin SDK is also initialized (for FCM messaging via service account) but is NOT used for token verification.

### Configuration (`config.py`)

pydantic-settings reads from environment + `.env` file. In production, can pull secrets from AWS Secrets Manager (FIREBASE_SECRET_NAME env var) and AWS SSM Parameter Store (AWS_SSM_PREFIX env var). All settings accessed via `settings.FIELD_NAME`.

### S3 Service (`services/s3.py`)

- `generate_upload_url(s3_key, content_type)` → presigned PUT URL (5 min expiry)
- `generate_download_url(s3_key)` → presigned GET URL (1 hour expiry)
- Allowed content types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Backend never touches image bytes on upload path

### Notifications Service (`services/notifications.py`)

- Uses FCM v1 API (not legacy FCM)
- Gets OAuth2 access token from Firebase service account credentials
- APScheduler runs daily to find implants with `follow_up_date = today + 7 days` and sends push notifications
- Supports Android, iOS, and web (different FCM payloads per platform)

---

## 7. Frontend — React

### Routing (`App.js`)

```
/login                     → Login.js (public)
/register                  → Register.js (public)
/privacy                   → PrivacyPolicy.js (public)
/profile/:doctorId         → DoctorPublicProfile.js (public)
/ (protected)
  index                    → Dashboard.js
  /patients                → Patients.js
  /patients/:id            → PatientDetails.js
  /patients/:patientId/vault → MedicalVault.js
  /analytics               → Analytics.js
  /clinics                 → Clinics.js
  /account                 → Account.js
  /backup                  → Backup.js
  /subscription            → Subscription.js
* → redirect to /
```

### The API Client (`src/api/client.js`)

**This is the most critical file in the frontend. Every backend call MUST go through it.**

```javascript
// client.js is an axios instance with two interceptors:
// 1. Request interceptor: gets fresh Firebase ID token, adds Authorization: Bearer <token>
// 2. Response interceptor: on 401, refreshes token and retries once
```

Never import axios directly in page components. Always:
```javascript
import client from '../api/client';
const { data } = await client.get('/api/patients');
```

### AuthContext (`src/contexts/AuthContext.js`)

Global auth state machine:
```
null           → still loading (ProtectedRoute shows spinner)
false          → not logged in (ProtectedRoute redirects to /login)
{ _needsRegistration: true, firebaseUser }  → Firebase OK, DB missing → show Register
{ id, name, email, ... }  → fully logged in
```

On page load: `onAuthStateChanged` fires → force-refreshes Firebase ID token → calls `/api/auth/me` → sets user state.

**Critical rule**: `loading` state gates ProtectedRoute. Never short-circuit it — the 3-attempt login bug (where login appears to need 2-3 clicks) is caused by `loading` flipping to false before `/api/auth/me` returns.

### Layout (`src/components/Layout.js`)

- **Desktop**: fixed 64px left sidebar with nav items, doctor profile dropdown (name, avatar, Account, Logout)
- **Mobile**: top header + fixed bottom tab bar (5 tabs)
- Sidebar hidden on mobile, bottom nav hidden on desktop

### DentalChart (`src/components/DentalChart.js`)

Canvas-based interactive FDI tooth diagram:
- 32 teeth in U-shape layout (upper arch: 11–28, lower arch: 31–48)
- Click a tooth → `ToothActionModal` opens (choose: add implant, FPD, mark missing, etc.)
- Color-coded per tooth state (healthy, implant, missing, FPD)
- Responsive: resizes with container

### PatientDetails.js — WARNING: LARGE FILE

Contains: FDI chart, implant modal, FPD modal, photo vault tab, all patient info sections. This file is large and fragile. New modals must be extracted to `src/components/` — do not add more logic here.

### Image Handling (`src/api/images.js`)

Client-side before upload:
1. Canvas API compresses to max 2048px JPEG (0.85 quality)
2. HEIC/HEIF files re-tagged as JPEG
3. Presigned PUT URL fetched from backend
4. Direct upload to S3 via XMLHttpRequest (shows progress %)
5. POST `/complete` so backend generates thumbnail (Pillow)
6. Presigned GET URLs cached locally for 58 min (below S3's 60 min expiry)

---

## 8. Authentication Flow

### First-time registration

```
1. User fills Register form (name, email, password, registration number)
2. Frontend: createUserWithEmailAndPassword(auth, email, password)
   → Firebase creates account, returns firebaseUser
3. Frontend: firebaseUser.getIdToken() → Firebase ID token
4. POST /api/auth/register { name, email, ... }
   Headers: Authorization: Bearer <token>
5. Backend: verify_id_token(token) → decoded { uid, email }
6. Backend creates Organization row (solo doctor = their own org)
7. Backend creates User row (firebase_uid = decoded.uid)
8. Returns UserRead JSON
9. Frontend: setUser(data) → navigate('/') → Dashboard
```

### Login (returning user)

```
1. User enters email + password on Login form
2. Frontend: signInWithEmailAndPassword(auth, email, password)
   → Firebase returns firebaseUser + ID token
3. onAuthStateChanged fires (Firebase event)
4. Frontend: firebaseUser.getIdToken(true) → fresh token
5. GET /api/auth/me
   Headers: Authorization: Bearer <token>
6. Backend: verify_id_token(token) → firebase_uid
7. Backend: SELECT * FROM users WHERE firebase_uid = ?
8. Returns UserRead JSON
9. Frontend: setUser(data) → Dashboard shows
```

### Google Sign-In

```
1. User clicks "Continue with Google"
2. signInWithPopup(auth, googleProvider) → popup OAuth flow
3. Same path as above from step 3 onward
4. If user not in DB (404 from /api/auth/me): setUser({ _needsRegistration: true })
   → Register page shown with email pre-filled
```

### Token Refresh

- Firebase SDK auto-refreshes tokens (1 hour expiry) silently
- `client.js` response interceptor: on 401, calls `firebaseUser.getIdToken(true)` and retries once
- Clock skew fix: `leeway=timedelta(seconds=60)` in `verify_id_token()`

---

## 9. Image Upload Flow (S3)

```
Frontend                    Backend                    AWS S3
   │                            │                         │
   │ 1. Compress image          │                         │
   │    (Canvas API, 2048px)    │                         │
   │                            │                         │
   │─── POST /cases/:id/images/upload-url ──────────────▶│
   │    { filename, content_type }                        │
   │                            │                         │
   │                            │─── generate_presigned_url(PUT) ──▶│
   │                            │◀── presigned PUT URL ────────────│
   │◀── { upload_url, image_id } ───────────────────────│
   │                            │                         │
   │─── PUT <presigned_url> ──────────────────────────────────────▶│
   │    image bytes directly                              │ stores object
   │◀── 200 OK ────────────────────────────────────────────────────│
   │                            │                         │
   │─── POST /cases/:id/images/:image_id/complete ──────▶│
   │                            │                         │
   │                            │─── download from S3 ───────────▶│
   │                            │◀── image bytes ──────────────────│
   │                            │─── Pillow resize (thumbnail) ───▶│
   │                            │─── upload thumbnail ────────────▶│
   │                            │ update DB: thumbnail_s3_key      │
   │◀── { image with thumbnail_url } ────────────────────│
```

The backend never handles image bytes on the upload path — they go directly from the browser to S3. The backend only generates URLs and processes thumbnails post-upload.

---

## 10. Mobile (Capacitor)

**App ID**: `com.osiolog.app`
**Capacitor version**: 8.3.1

### URL Routing per Platform

| Platform | API Base URL | Why |
|---------|-------------|-----|
| Web browser | `http://localhost:8002` | Direct |
| Android emulator | `http://10.0.2.2:8002` | Emulator alias for host loopback |
| iOS simulator | `http://localhost:8002` | Simulator shares Mac network |
| Physical device | `http://<LAN-ip>:8002` | Must be on same Wi-Fi |
| Production | `https://api.osiolog.com` | Real HTTPS |

`client.js` detects platform via `Capacitor.getPlatform()` and rewrites URLs automatically. Never hardcode URLs in page components.

### Build Commands

```bash
# 1. Build React app
NODE_OPTIONS=--openssl-legacy-provider npx craco build

# 2. Sync to native projects
node_modules/.bin/cap sync android   # or ios

# 3. Android
cd android
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr  # Windows
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 4. iOS (Mac only)
open ios/App/App.xcodeproj   # build from Xcode
```

### Android-Specific Config

`capacitor.config.json`:
```json
"server": { "androidScheme": "http", "cleartext": true },
"android": { "allowMixedContent": true }
```

`android/app/src/main/res/xml/network_security_config.xml`: cleartext traffic allowed for `10.0.2.2` and `localhost`.

`android/app/src/main/AndroidManifest.xml`: `android:usesCleartextTraffic="true"`.

### ADB Tunnel (for Android emulator ↔ local backend)

```bash
adb reverse tcp:8002 tcp:8002
```

Run once per emulator boot. Routes emulator's `localhost:8002` to Mac's `localhost:8002`.

---

## 11. Push Notifications (FCM)

### Registration Flow

```
App starts → user logged in → registerForNotifications()
  → Capacitor.getPlatform() === 'android'|'ios'
      → PushNotifications.requestPermissions()
      → PushNotifications.register()
      → FCM token received
  OR web browser
      → firebase.messaging().getToken(vapidKey)
  
  Token → POST /api/notifications/device-token
         { fcm_token, platform }
  Backend stores in device_tokens table
```

### Sending Notifications (APScheduler)

APScheduler runs daily at startup:
```
SELECT implants WHERE follow_up_date = today + 7 days
For each implant:
  GET patient name
  GET doctor's device tokens
  POST to FCM v1 API:
    { title: "Follow-up Reminder", body: "Patient X — implant follow-up in 7 days" }
```

---

## 12. Design System

Source of truth: `osiolog-frontend/design_guidelines.json`

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Brand | `#82A098` | Buttons, active states, icons |
| Brand hover | `#6B8A82` | Hover states |
| Accent | `#C27E70` | Destructive actions, alerts |
| Background primary | `#F9F9F8` | Page background |
| Background secondary | `#F0F0EE` | Sidebar, cards |
| Surface | `#FFFFFF` | Card content areas |
| Text primary | `#2A2F35` | Headings, body text |
| Text secondary | `#5C6773` | Labels, captions |
| Text disabled | `#A1A9B3` | Disabled inputs |
| Border | `#E5E5E2` | All borders |
| Success | `#82A098` | Same as brand |
| Warning | `#E8A76C` | Orange warnings |
| Error | `#C27E70` | Same as accent |

### Typography

| Role | Font | Notes |
|------|------|-------|
| Headings | Work Sans | All `h1`–`h4` |
| Body | IBM Plex Sans | All `p`, `label`, `span` |
| Monospace | IBM Plex Mono | Code, IDs |

### Component Rules

- **Cards**: `rounded-xl`, `border border-[#E5E5E2]`, `shadow-sm` — never heavy drop shadows
- **Buttons**: brand color background, white text, `rounded-lg`
- **Every interactive element MUST have `data-testid` attribute** — required for automated QA
- **Spacing**: generous `p-6`/`p-8` inside cards
- **No hardcoded hex colors** — always use the design tokens above

---

## 13. Local Development Setup

### One-time setup

```bash
# 1. Navigate to backend directory
cd osiolog-frontend/backend

# 2. Create Python virtual environment
python -m venv venv

# 3. Activate it (Windows)
source venv/Scripts/activate      # Git Bash / WSL
# OR
venv\Scripts\activate.bat          # Windows CMD

# 4. Install Python dependencies
pip install -r requirements.txt

# 5. Create .env file (see Section 14 for values)
# Copy the template and fill in your values

# 6. Create PostgreSQL database
# Windows: use pgAdmin or SQL Shell
CREATE DATABASE osioloc_dev;

# 7. Run migrations
alembic upgrade head

# 8. Install frontend dependencies
cd ../frontend
npm install --legacy-peer-deps
```

### Starting servers (every session)

**Terminal 1 — Backend:**
```bash
cd osiolog-frontend/backend
source venv/Scripts/activate

# Windows: run WITHOUT --reload to avoid duplicate process bug
python -m uvicorn app.main:app --port 8002 --host 0.0.0.0

# Mac/Linux: --reload is safe
python -m uvicorn app.main:app --reload --port 8002 --host 0.0.0.0
```

**Terminal 2 — Frontend:**
```bash
cd osiolog-frontend/frontend
NODE_OPTIONS=--openssl-legacy-provider npx craco start
```

**Verify:**
```bash
curl http://localhost:8002/api/health
# → {"status":"ok","db":"ok"}
# Frontend: open http://localhost:3000
```

### Demo account
- **Email**: `doctor@dentalapp.com`
- **Password**: `doctor123`
- Already registered in Firebase project `osiolog-prod` and local DB

### Windows-specific gotchas

1. **Never use `--reload` with uvicorn on Windows** — it creates TWO processes on port 8002, causing intermittent auth failures. The hot-reload doesn't kill the old worker cleanly. After any code change, kill all Python processes (`Stop-Process` in PowerShell) and restart manually.

2. **Clock skew** — Windows clock can drift 5–10 seconds behind Firebase servers. The `leeway=timedelta(seconds=60)` fix in `firebase.py` handles this. If you still see `InvalidIssuedAtError`, sync your Windows clock: Settings → Time & Language → Sync now.

3. **Kill all Python processes** (when port 8002 is stuck):
   ```powershell
   Get-Process | Where-Object { $_.ProcessName -match "python" } | Stop-Process -Force
   ```

---

## 14. Environment Variables

### Backend (`osiolog-frontend/backend/.env`)

```env
# PostgreSQL connection string
# Note: if password contains @, URL-encode it as %40
# e.g. password "Mj@06" → "Mj%4006" in the URL
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/osioloc_dev

# Firebase (backend token verification + FCM)
FIREBASE_PROJECT_ID=osiolog-prod
# Can be a file path OR the full JSON content as a single-line string
FIREBASE_SERVICE_ACCOUNT_JSON=/path/to/osiolog-prod-firebase-adminsdk.json

# AWS S3 — IAM user: osioloc-backend
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET_NAME=dentalhub-clinical-images
AWS_REGION=ap-south-1

# App settings
FRONTEND_URL=https://app.osiolog.com
ENVIRONMENT=production
```

### Frontend (`osiolog-frontend/frontend/.env.local`)

```env
REACT_APP_BACKEND_URL=http://localhost:8002

REACT_APP_FIREBASE_API_KEY=AIzaSyDIU1K6wogiRx8KTogouocRrV0-KyAGr_s
REACT_APP_FIREBASE_AUTH_DOMAIN=osiolog-prod.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=osiolog-prod
REACT_APP_FIREBASE_STORAGE_BUCKET=osiolog-prod.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=747033067519
REACT_APP_FIREBASE_APP_ID=1:747033067519:web:6ff375e7b621f05312b1ca
REACT_APP_FIREBASE_VAPID_KEY=   # set for web push notifications
```

### AWS IAM Users

| User | Access Key | Purpose |
|------|------------|---------|
| `osioloc-backend` | *(in AWS IAM console)* | S3 read/write from backend |
| `osioloc-cli-admin` | *(in AWS IAM console)* | CLI/admin operations |

### Firebase Service Account

- File: `osiolog-prod-firebase-adminsdk-fbsvc-9add5b1cbd.json` (at project root)
- Client email: `firebase-adminsdk-fbsvc@osiolog-prod.iam.gserviceaccount.com`
- Never commit this file to git

---

## 15. API Endpoint Reference

All endpoints prefixed with `/api/`. All protected routes require `Authorization: Bearer <firebase_id_token>`.

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | `{"status":"ok","db":"ok"}` |

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Firebase token | Create doctor account + org |
| GET | `/auth/me` | Yes | Get current user profile |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/users/me` | Yes | Update profile (name, bio, college, etc.) |
| DELETE | `/users/me` | Yes | Delete account |

### Patients
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/patients` | Yes | List (paginated, searchable) |
| POST | `/patients` | Yes | Create |
| GET | `/patients/:id` | Yes | Detail |
| PATCH | `/patients/:id` | Yes | Update |
| DELETE | `/patients/:id` | Yes | Soft delete |
| GET | `/patients/:id/implants` | Yes | All implants for patient |
| GET | `/patients/:id/fpd` | Yes | All FPD records |

### Cases
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/cases` | Yes | List (filter: `?patient_id=`) |
| POST | `/cases` | Yes | Create |
| GET | `/cases/:id` | Yes | Detail |
| PATCH | `/cases/:id` | Yes | Update |
| DELETE | `/cases/:id` | Yes | Delete |

### Implants
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/cases/:caseId/implants` | Yes | List by case |
| POST | `/cases/:caseId/implants` | Yes | Create |
| GET | `/implants/:id` | Yes | Detail |
| PATCH | `/implants/:id` | Yes | Update |
| DELETE | `/implants/:id` | Yes | Delete |
| GET | `/implants/all` | Yes | All implants (dashboard) |
| GET | `/implants/due-for-second-stage` | Yes | Follow-up alerts |

### Case Images (S3)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/cases/:id/images/upload-url` | Yes | Get presigned S3 PUT URL |
| POST | `/cases/:id/images/:imageId/complete` | Yes | Mark upload done, gen thumbnail |
| GET | `/cases/:id/images` | Yes | List with presigned GET URLs |
| DELETE | `/cases/:id/images/:imageId` | Yes | Delete from S3 + DB |

### FPD Records
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/fpd-records` | Yes | List |
| POST | `/fpd-records` | Yes | Create |
| PUT | `/fpd-records/:id` | Yes | Update |

### Clinics
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/clinics` | Yes | List |
| POST | `/clinics` | Yes | Create |
| GET | `/clinics/:id` | Yes | Detail |
| PATCH | `/clinics/:id` | Yes | Update |
| DELETE | `/clinics/:id` | Yes | Delete |

### Dashboard & Analytics
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard/summary` | Yes | `{total_patients, active_cases, cases_this_month, upcoming_followups}` |
| GET | `/analytics/overview` | Yes | Case metrics for charts |
| GET | `/analytics/financial` | Yes | Cost analysis |

### Notifications
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/notifications/device-token` | Yes | Register FCM token |
| DELETE | `/notifications/device-token` | Yes | Unregister |

### Audit
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/audit-events` | Yes | Audit log |

---

## 16. Key Bugs & Fixes

### Bug 1: Clock Skew — "Invalid or expired token"

**Root cause**: Local Windows machine clock was 7 seconds behind Firebase servers. PyJWT 2.12.1 validates `iat` (issued-at) claim — if `iat > now`, throws `ImmatureSignatureError`.

**Fix** (`backend/app/core/firebase.py:95`):
```python
claims = jwt.decode(
    id_token,
    key=public_key,
    algorithms=["RS256"],
    audience=project_id,
    issuer=f"{_ISSUER_PREFIX}{project_id}",
    options={"verify_exp": True},
    leeway=timedelta(seconds=60),   # ← added
)
```

**Prevention**: Sync Windows clock regularly (Settings → Time → Sync now).

### Bug 2: Alembic configparser rejects `%` in DATABASE_URL

**Root cause**: Python `configparser` (used internally by Alembic's `config.set_main_option()`) interprets `%` as a format string interpolation character. A URL-encoded `@` sign (`%40`) in the password caused `ValueError: invalid interpolation syntax`.

**Fix** (`backend/alembic/env.py`):
```python
database_url = os.environ.get("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
```

### Bug 3: Alembic doesn't load `.env` file

**Root cause**: Alembic reads `DATABASE_URL` from `os.environ`, but pydantic-settings (used by FastAPI) is the only thing that loads the `.env` file. Alembic env.py runs independently.

**Fix** (`backend/alembic/env.py`):
```python
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
```

### Bug 4: Duplicate uvicorn processes on Windows with `--reload`

**Root cause**: On Windows, uvicorn's watchfiles reloader spawns a new worker process but doesn't reliably kill the old one when file changes are detected. Both processes bind to port 8002 simultaneously. Requests hit either process randomly — one has the new code, one has the old code.

**Fix**: Don't use `--reload` on Windows. Kill all Python processes before restarting:
```powershell
Get-Process | Where-Object { $_.ProcessName -match "python" } | Stop-Process -Force
```

### Bug 5: npm install fails on React 19 peer deps

**Root cause**: Shadcn/Radix components have peer dependency conflicts with React 19 (they were tested against React 18).

**Fix**: `npm install --legacy-peer-deps`

---

## 17. gstack Workflow

This project uses [gstack](https://github.com/garrytan/gstack) — an AI engineering workflow toolkit installed globally at `~/.claude/skills/gstack/`.

**Available skills (invoke via `/skill-name` in Claude Code):**

| Skill | When to use |
|-------|-------------|
| `/office-hours` | Brainstorm new features, scope decisions |
| `/plan-ceo-review` | Challenge product direction before building |
| `/plan-eng-review` | Lock architecture before coding |
| `/review` | Code review before PR |
| `/qa` | Browser-based QA testing (finds + fixes bugs) |
| `/qa-only` | QA report only, no auto-fixes |
| `/investigate` | Systematic debugging with root cause analysis |
| `/ship` | Tests + PR + push to main |
| `/cso` | OWASP security audit |
| `/design-review` | Visual QA + auto-fix UI issues |
| `/retro` | Weekly engineering retrospective |

**Recommended sprint workflow:**
```
1. /office-hours   → define what to build
2. /plan-eng-review → lock the architecture
3. Build it
4. /review         → catch bugs before PR
5. /qa [localhost:3000] → browser QA
6. /ship           → tests + PR
```

### gstack Installation (Windows)

gstack requires Bun runtime. Already installed at `C:\Users\MJ\.bun\bin\bun.exe`.

To reinstall from scratch:
```bash
# 1. Install Bun (PowerShell)
irm bun.sh/install.ps1 | iex

# 2. Run gstack setup (Git Bash)
export PATH="$PATH:/c/Users/MJ/.bun/bin"
cd /c/Users/MJ/Desktop/dental-implant-notes-main/gstack
bash setup --no-prefix -q
```

---

## 18. Deployment Notes

### Production URLs
- Frontend: `https://app.osiolog.com`
- Backend API: `https://api.osiolog.com`
- Health check: `curl https://api.osiolog.com/api/health`

### Scaling to Production (from local)

1. **Database**: Upgrade AWS account plan to access Lightsail, or use Neon free tier (neon.tech)
2. **Backend**: Deploy Docker container (`backend/Dockerfile`) to AWS ECS, Fly.io, or Render
3. **Frontend**: `npm run build` → deploy `build/` to S3+CloudFront or Vercel
4. **Mobile**: Follow Capacitor build process → publish to Google Play / App Store
5. **env vars**: Move to AWS Secrets Manager (FIREBASE_SECRET_NAME env var triggers auto-load)

### Nginx Config (`nginx.conf` at project root)
- Routes `/api/*` → backend
- Routes `/` → React build static files
- Gzip compression, CORS headers, caching for static assets

### CI/CD (`.github/workflows/`)
- GitHub Actions workflows exist — check before pushing to main

---

*This document was generated on 2026-04-30 after the initial local setup of the project. Keep it updated as the project evolves.*
