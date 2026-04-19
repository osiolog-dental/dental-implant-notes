# Data Model

Production PostgreSQL schema. All tables are tenant-scoped by `org_id` except where noted.

```sql
organizations   { id, name, created_at }

users           { id, org_id, firebase_uid, email, name, phone, country,
                  registration_number, college, specialization, profile_picture,
                  place, created_at }

clinics         { id, org_id, name, address, created_at }

patients        { id, org_id, doctor_id, name, age, gender, phone, email,
                  address, medical_history, created_at }

cases           { id, patient_id, doctor_id, clinic_id, title, status,
                  created_at }
-- cases is a first-class billing unit; every implant and FPD log links to a case.
-- Each case may hold 12–25 images.

case_images     { id, case_id, s3_key, content_type, uploaded_at }

implants        { id, case_id, patient_id, tooth_number, implant_type, brand,
                  size, length, insertion_torque, connection_type,
                  surgical_approach, bone_graft, sinus_lift_type, is_pterygoid,
                  is_zygomatic, is_subperiosteal, arch, jaw_region,
                  implant_system, cover_screw, healing_abutment, membrane_used,
                  isq_value, follow_up_date, surgeon_name, surgery_date,
                  prosthetic_loading_date, implant_outcome,
                  osseointegration_success, peri_implant_health, notes }

prosthetic_fpd  { id, case_id, patient_id, tooth_numbers[], prosthetic_loading_date,
                  crown_count, connected_implant_ids[], crown_type, material,
                  clinical_notes }

device_tokens   { id, user_id, fcm_token, platform, updated_at }

audit_events    { id, org_id, user_id, action, entity_type, entity_id,
                  metadata, created_at }

invites         { id, org_id, email, role, token, expires_at, accepted_at }
```
