# API Contracts

All endpoints are prefixed `/api/v1`. Every request to a protected route must include a Firebase ID token in the `Authorization: Bearer <token>` header. All list endpoints support `?page=`, `?limit=`, `?search=`, and relevant filter params. All tenant-owned resources are scoped by `org_id` derived from the verified token.

---

### Auth

#### `POST /api/v1/auth/verify`
TBD — Exchange Firebase ID token for a session; create user record on first login.

#### `GET /api/v1/auth/me`
TBD — Return the authenticated user's profile.

---

### Users / Profile

#### `GET /api/v1/users/me`
TBD — Return full doctor profile.

#### `PATCH /api/v1/users/me`
TBD — Update doctor profile fields (name, college, place, specialization, phone, etc.).

#### `POST /api/v1/users/me/profile-picture`
TBD — Upload profile picture via presigned S3 URL.

---

### Patients

#### `GET /api/v1/patients`
TBD — Paginated, searchable list of patients for the authenticated doctor's org.

#### `POST /api/v1/patients`
TBD — Create a new patient record.

#### `GET /api/v1/patients/{patient_id}`
TBD — Return a single patient with full detail.

#### `PATCH /api/v1/patients/{patient_id}`
TBD — Update patient demographics or medical history.

#### `DELETE /api/v1/patients/{patient_id}`
TBD — Soft-delete a patient record.

---

### Cases

#### `GET /api/v1/patients/{patient_id}/cases`
TBD — List all cases for a patient.

#### `POST /api/v1/patients/{patient_id}/cases`
TBD — Create a new case linked to a patient.

#### `GET /api/v1/cases/{case_id}`
TBD — Return a case with its implants, FPD logs, and image metadata.

#### `PATCH /api/v1/cases/{case_id}`
TBD — Update case title or status.

---

### Implants

#### `GET /api/v1/cases/{case_id}/implants`
TBD — List all implants in a case.

#### `POST /api/v1/cases/{case_id}/implants`
TBD — Log a new implant placement for a case.

#### `PATCH /api/v1/implants/{implant_id}`
TBD — Update implant outcome, ISQ, osseointegration status, etc.

#### `DELETE /api/v1/implants/{implant_id}`
TBD — Remove an implant log entry.

---

### FPD (Fixed Partial Dentures)

#### `GET /api/v1/cases/{case_id}/fpd`
TBD — List FPD logs for a case.

#### `POST /api/v1/cases/{case_id}/fpd`
TBD — Create an FPD log entry linked to a case.

#### `PATCH /api/v1/fpd/{fpd_id}`
TBD — Update FPD log details.

---

### Images

#### `POST /api/v1/cases/{case_id}/images/upload-url`
TBD — Request a presigned S3 PUT URL. Client uploads directly to S3 and then calls the confirm endpoint.

#### `POST /api/v1/cases/{case_id}/images/confirm`
TBD — Confirm that a direct S3 upload succeeded; persist the `s3_key` and metadata to `case_images`.

#### `GET /api/v1/cases/{case_id}/images`
TBD — List images for a case with presigned GET URLs (short TTL).

#### `DELETE /api/v1/images/{image_id}`
TBD — Delete image record from DB and object from S3.

---

### Clinics

#### `GET /api/v1/clinics`
TBD — List clinics for the authenticated org.

#### `POST /api/v1/clinics`
TBD — Create a clinic.

#### `PATCH /api/v1/clinics/{clinic_id}`
TBD — Update clinic details.

---

### Device Tokens (FCM)

#### `POST /api/v1/device-tokens`
TBD — Register or update an FCM device token for push notifications.

#### `DELETE /api/v1/device-tokens/{token_id}`
TBD — Remove a device token on logout.
