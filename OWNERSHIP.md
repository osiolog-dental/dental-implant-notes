# Osioloc — Project Ownership & Authorship Record

**This document establishes the intellectual property, authorship, and technical ownership of the Osioloc dental implant case management platform.**

---

## Primary Author & Owner

| Field | Detail |
|---|---|
| **Owner** | Midhilesh Krishna |
| **Email** | midhilesh163@gmail.com |
| **GitHub** | midhilesh163-pixel |
| **Project started** | March 25, 2026 |
| **Document created** | April 19, 2026 |

---

## What Was Built

Osioloc is a full-stack dental implant case management system built from scratch, designed for dentists and implantologists in India. It ships as a web app, Android app, and iOS app.

### Core Product Features (all built by Midhilesh Krishna)

| Phase | Feature | Date Completed |
|---|---|---|
| Phase 1 | Project architecture, tech stack selection, initial setup | March 25, 2026 |
| Phase 2 | Firebase Authentication (email/password + Google Sign-In) | March 30, 2026 |
| Phase 3 | PostgreSQL database schema + SQLAlchemy async ORM | April 10, 2026 |
| Phase 4 | Patient CRUD, doctor-scoped data, multi-tenant isolation | April 11, 2026 |
| Phase 5 | FDI dental chart (interactive, image-based, tooth conditions) | April 12, 2026 |
| Phase 6 | AWS S3 photo/radiograph vault with presigned URLs + thumbnails | April 12, 2026 |
| Phase 7 | Implant tracking modal (torque, brand, bone graft, sinus lift, ISQ) | April 14, 2026 |
| Phase 7 | FPD (Fixed Partial Denture) log sheet | April 14, 2026 |
| Phase 7 | Excel bulk import for patients and implants | April 15, 2026 |
| Phase 7 | PDF patient report export | April 15, 2026 |
| Phase 7 | Doctor public profile with QR code | April 15, 2026 |
| Phase 7 | Consultant doctor fields + lab warranty image support | April 16, 2026 |
| Phase 8 | Analytics dashboard (Recharts) | April 16, 2026 |
| Phase 8 | Clinic management | April 16, 2026 |
| Phase 8 | Account page with full profile editing | April 17, 2026 |
| Phase 9 | FCM push notifications (native Android/iOS + web) | April 19, 2026 |
| Phase 9 | APScheduler follow-up reminders (daily cron at 8AM IST) | April 19, 2026 |
| Phase 10 | Audit logging on all patient/implant/case mutations | April 19, 2026 |
| Phase 10 | Full test suite — 17 tests, real PostgreSQL, no mocks | April 19, 2026 |
| Phase 11 | Delete Account endpoint (App Store requirement) | April 19, 2026 |
| Phase 11 | Android release keystore + Play Store prep | April 19, 2026 |
| Phase 12 | AWS EC2 + RDS production deployment (Mumbai ap-south-1) | April 19, 2026 |
| Phase 12 | HTTPS via Let's Encrypt SSL on api.osiolog.com + app.osiolog.com | April 19, 2026 |
| Phase 12 | GitHub Actions CI/CD pipeline | April 19, 2026 |
| Phase 12 | Privacy Policy page | April 19, 2026 |

---

## Infrastructure Ownership

All infrastructure is registered and owned by Midhilesh Krishna.

### AWS (ap-south-1 Mumbai)
| Resource | ID / Endpoint |
|---|---|
| EC2 Instance | i-04a36f54b5105d9c6 (t3.micro) |
| EC2 Public IP | 35.154.160.108 |
| RDS PostgreSQL | osioloc-db.c3goqqwwyx6q.ap-south-1.rds.amazonaws.com |
| S3 Bucket | osioloc-cases-prod |
| AWS Account | midhilesh163@gmail.com |
| Region | ap-south-1 (Mumbai, India) |

### Firebase
| Resource | Detail |
|---|---|
| Project ID | osiolog-prod |
| Auth methods | Email/password, Google Sign-In |
| Admin email | midhilesh163@gmail.com |

### GitHub
| Resource | Detail |
|---|---|
| Organisation | osiolog-dental |
| Repository | osiolog-dental/dental-implant-notes |
| Visibility | Private |

### Domain
| Resource | Detail |
|---|---|
| Domain | osiolog.com |
| Registrar | Cloudflare |
| API subdomain | api.osiolog.com → EC2 |
| App subdomain | app.osiolog.com → EC2 |

---

## Git Commit History (Tamper-Proof Record)

Git hashes are cryptographically generated — they cannot be forged or backdated without detection.

| Commit Hash | Date | Description |
|---|---|---|
| a353025a | 2026-03-25 | Initial commit |
| 083e84a5 | 2026-03-30 | Auth + registration setup |
| 6b4f20c9 | 2026-04-10 | Local dev stack + backend |
| 576326a6 | 2026-04-11 | Auth/API connectivity fix |
| f41c8608 | 2026-04-12 | Dashboard, implant scanner, registration |
| d111d9b8 | 2026-04-12 | Engineering standards + branding |
| d6c689e8 | 2026-04-12 | Image-based FDI dental chart |
| 67be85f9 | 2026-04-14 | Patient profile picture + change history |
| 2fbf81e0 | 2026-04-15 | Dental chart PNG icons |
| 9a21a7a0 | 2026-04-15 | Backup & restore system |
| a9807c8a | 2026-04-15 | Extra photo slots (up to 12) |
| 90583d3a | 2026-04-15 | PDF report export |
| fbaee9d0 | 2026-04-16 | Subscription plans + ad banner |
| dd779a4a | 2026-04-16 | Doctor public profile + QR code |
| ab19250a | 2026-04-17 | Full profile editing on Account page |
| 02dc2e2a | 2026-04-17 | Excel bulk import |
| f1c94c7a | 2026-04-17 | Consultant doctor + FPD lab fields |
| ffaf735a | 2026-04-17 | Excel template update |
| 38bab49a | 2026-04-18 | Tooth condition confirmation dialogs |
| 6cde7e9a | 2026-04-19 | Phases 9-12: notifications, audit, delete account, deployment |
| a80950fa | 2026-04-19 | Production backend URL |
| 376ec3ea | 2026-04-19 | HTTPS via api.osiolog.com |
| cd8a2c8a | 2026-04-19 | Privacy Policy page |

**Latest commit hash:** `cd8a2c86055ac35ea388b47f36ee32d9504662c6`
**First commit hash:** `a353025a467be3b3b960aa3c1b59197e31c613bd`
**Total commits:** 35

To verify this history is untampered, run:
```bash
git log --oneline
git log --format="%H %ai %s"
```

---

## Technology Stack (All Selected and Implemented by Owner)

| Layer | Technology | Decision rationale |
|---|---|---|
| Frontend | React 19, Tailwind CSS, Shadcn UI | Component ecosystem, rapid UI development |
| Mobile | Capacitor 8 (iOS + Android) | Single codebase for web + native |
| Backend | FastAPI + SQLAlchemy async | High performance async Python API |
| Database | PostgreSQL on AWS RDS | ACID compliance, scalable, free tier |
| Auth | Firebase Authentication | Handles Google Sign-In, secure token verification |
| Storage | AWS S3 (ap-south-1) | Scalable, presigned URLs, private by default |
| Notifications | Firebase Cloud Messaging | Native push on Android/iOS + web |
| Hosting | AWS EC2 t3.micro (Mumbai) | Low latency for Indian users, free tier |
| SSL | Let's Encrypt via Certbot | Free, auto-renewing |
| CI/CD | GitHub Actions | Auto-deploy on push to main |

---

## How to Verify Ownership (Anyone Can Check)

1. **GitHub:** Visit `https://github.com/osiolog-dental/dental-implant-notes` — commit history shows all work with timestamps
2. **AWS:** EC2 instance `i-04a36f54b5105d9c6` is registered under `midhilesh163@gmail.com`
3. **Live app:** `https://app.osiolog.com` and `https://api.osiolog.com/api/health`
4. **Git hash verification:** Every commit hash in this document can be verified with `git show <hash>`

---

## Legal Notice

This codebase, architecture, and all associated intellectual property was conceived, designed, and built by **Midhilesh Krishna** between March 25, 2026 and April 19, 2026. All rights reserved.

Any contributor added to this project after the above date works under the direction of and at the discretion of the primary owner. Contribution to this repository does not constitute ownership or co-ownership of the product, brand, or business.

---

*This document is version-controlled in git. Any modification to this file will be recorded in the git history with a timestamp and is therefore tamper-evident.*
