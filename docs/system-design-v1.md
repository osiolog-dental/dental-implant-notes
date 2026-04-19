# Osioloc — App System Design v1

## What Gets Hosted and Where

### Hosted on AWS

**1. EC2 t2.micro — App Server (FastAPI backend)**
All the Python code in `backend/app/`. Runs as a process on a Linux server in Mumbai (ap-south-1).
Every API call from the doctor's phone goes here.
- Free for 12 months on AWS free tier
- After free tier: ~$8–10/month

**2. RDS PostgreSQL db.t3.micro — Database**
All structured clinical data — patients, implants, cases, FPD records, clinics, users, organisations.
Managed by Alembic migrations. Never touched directly in production.
- Free for 12 months on AWS free tier
- After free tier: ~$15/month

**3. S3 — File Storage (`osioloc-cases-prod`, Mumbai)**
All clinical images and radiographs. Already live.
Doctors never talk to S3 directly — EC2 issues a presigned URL and the device uploads straight to S3.
Lifecycle policy moves files to cheaper storage automatically after 90 days.
- ~$0 at current scale (first 5GB free, then ~$0.023/GB)

---

### NOT Hosted on AWS

| Component | Where it lives | Cost |
|---|---|---|
| Frontend (React app) | Doctor's iPhone / Android device | $0 — runs on device via Capacitor |
| Firebase Auth | Google's servers | $0 forever |
| FCM Push Notifications | Google's servers | $0 forever |

---

## Full System Architecture

```
┌─────────────────────────────────────────┐
│  Doctor's iPhone / Android              │
│  React app (Capacitor)                  │
│  - Runs entirely on device              │
│  - Calls EC2 for all data               │
│  - Uploads images directly to S3        │
│  - Logs in via Firebase Auth            │
└──────────────┬──────────────────────────┘
               │ HTTPS API calls
               ▼
┌─────────────────────────────────────────┐
│  AWS EC2 t2.micro  (ap-south-1 Mumbai)  │
│  FastAPI + uvicorn + nginx              │
│  → backend/app/                         │
│  FREE for 12 months                     │
└──────┬──────────────┬───────────────────┘
       │              │
       ▼              ▼
┌────────────┐  ┌─────────────────────────┐
│ AWS RDS    │  │ AWS S3                  │
│ PostgreSQL │  │ osioloc-cases-prod      │
│ db.t3.micro│  │ Private bucket, Mumbai  │
│ FREE 12mo  │  │ Lifecycle tiering active│
└────────────┘  └─────────────────────────┘

Google (Firebase) — Auth + FCM — free forever
```

---

## Request Flow

### Doctor logs in
```
Device → Firebase (Google) → ID token returned to device
Device → EC2 /api/auth/me  (Bearer token in header)
EC2    → Firebase Admin SDK (verify token)
EC2    → RDS (fetch user profile)
EC2    → Device (user profile JSON)
```

### Doctor uploads a clinical image
```
Device → EC2  /api/cases/{id}/images/upload-url  (get presigned URL)
Device → S3   PUT image directly (no bytes go through EC2)
Device → EC2  /api/cases/{id}/images/{id}/complete
EC2    → S3   download image, generate 600px thumbnail
EC2    → S3   upload thumbnail to thumbnails/ prefix
EC2    → RDS  mark image as uploaded, store s3_key + thumbnail_s3_key
```

### Doctor views patient images
```
Device → EC2  GET /api/cases/{id}/images
EC2    → RDS  fetch image rows
EC2    → S3   generate presigned GET URLs (1hr expiry, never expose raw keys)
EC2    → Device (list of {url, thumbnail_url})
Device → S3   fetch thumbnails directly for gallery view
Device → S3   fetch full image only when doctor taps to open
```

---

## Production Deploy Flow (Phase 12)

```
git push origin main
       ↓
GitHub Actions
  1. SSH into EC2
  2. git pull
  3. alembic upgrade head  ← applies DB schema changes to RDS
  4. restart uvicorn
       ↓
New version live
```

The React/Capacitor app is deployed separately via App Store / Play Store updates.
No server-side rendering — frontend runs entirely on the doctor's device.

---

## Cost at Scale

| Users | Monthly cost | Notes |
|---|---|---|
| 0–any | $0 | AWS free tier (12 months from account creation) |
| 100 | ~$21 | After free tier: EC2 $8 + RDS $15 + S3 <$1 |
| 500 | ~$29 | EC2 small $10 + RDS $15 + S3 $4 |
| 1,000 | ~$58 | EC2 medium $20 + RDS small $30 + S3 $8 |
| 3,000–5,000 | ~$134–237 | EC2 large + LB + RDS medium + S3 |

Infrastructure is less than 1% of revenue at every scale if charging ₹799/doctor/month.

---

## Infrastructure IDs (dev/prod)

| Resource | Value |
|---|---|
| Firebase project | `osioloc-prod` |
| S3 bucket | `osioloc-cases-prod` |
| AWS region | `ap-south-1` (Mumbai) |
| IAM app user | `osioloc-backend` |
| Local dev DB | `osioloc_dev` (PostgreSQL 14) |
| Backend port (dev) | `8002` |
| Backend port (prototype) | `8001` |

---

*Created: 2026-04-17 | Version: 1.0*
