from dotenv import load_dotenv
from pathlib import Path
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging early
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Query, Header
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta, date
from bson import ObjectId
import bcrypt
import jwt
import secrets
import uuid
import shutil

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')],
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT_ALGORITHM = "HS256"
APP_NAME = "dentalhub"

# Local file storage — files saved under backend/uploads/
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

def put_object(path: str, data: bytes, content_type: str) -> dict:
    dest = UPLOAD_DIR / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return {"path": path, "size": len(data), "content_type": content_type}

def get_object(path: str) -> tuple:
    dest = UPLOAD_DIR / path
    if not dest.exists():
        raise HTTPException(status_code=404, detail="File not found")
    ext = dest.suffix.lower()
    mime_map = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf"
    }
    content_type = mime_map.get(ext, "application/octet-stream")
    return dest.read_bytes(), content_type

# Helper Functions
def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# Auth Routes
@api_router.get("/")
async def root():
    return {"message": "Dental Hub API", "status": "running"}

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Models
class DoctorRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    country: str
    currency: Optional[str] = 'USD'
    registration_number: str
    college: Optional[str] = None
    specialization: str
    profile_picture: Optional[str] = None
    # Extended fields
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    designation: Optional[str] = None
    organization: Optional[str] = None
    years_of_experience: Optional[str] = None
    primary_clinic: Optional[str] = None
    consulting_clinics: Optional[str] = None
    clinical_focus: Optional[str] = None
    education: Optional[List[Dict[str, Any]]] = []
    publications: Optional[List[Dict[str, Any]]] = []

class DoctorLogin(BaseModel):
    email: EmailStr
    password: str

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None

class ClinicCreate(BaseModel):
    name: str
    address: str
    phone: str
    email: Optional[str] = None

class ImplantCreate(BaseModel):
    patient_id: str
    tooth_number: int
    implant_type: str
    brand: str
    size: str
    length: str
    insertion_torque: Optional[float] = None
    connection_type: str
    surgical_approach: str
    bone_graft: Optional[str] = None
    sinus_lift_type: Optional[str] = None
    is_pterygoid: bool = False
    is_zygomatic: bool = False
    is_subperiosteal: bool = False
    notes: Optional[str] = None
    clinic_id: Optional[str] = None
    # Enhanced fields
    adjunctive_procedures: Optional[List[str]] = []
    clinical_notes: Optional[str] = None
    surgery_date: Optional[str] = None
    prosthetic_loading_date: Optional[str] = None
    implant_outcome: Optional[str] = "Pending"
    medical_red_flags: Optional[List[Dict[str, Any]]] = []
    diameter_mm: Optional[float] = None
    length_mm: Optional[float] = None
    osseointegration_success: bool = False
    peri_implant_health: bool = False
    site_specific_notes: Optional[str] = None
    complication_remarks: Optional[str] = None
    case_number: Optional[str] = None
    # NEW FIELDS from Reference Excel
    arch: Optional[str] = "Upper"  # Upper/Lower
    jaw_region: Optional[str] = "Anterior"  # Anterior/Posterior
    implant_system: Optional[str] = None  # Product line/system name
    cover_screw: bool = False
    healing_abutment: bool = False
    membrane_used: bool = False
    isq_value: Optional[float] = None  # Implant Stability Quotient
    follow_up_date: Optional[str] = None
    surgeon_name: Optional[str] = None
    tag_image: Optional[str] = None   # base64 data URL of the implant package label
    # Progress tracking
    current_stage: int = 1  # 1=Placement, 2=Second Stage/Impressions, 3=Prosthesis Delivery
    osseointegration_days: int = 90  # Editable healing period in days
    stage_2_date: Optional[str] = None  # Date stage 2 was logged
    stage_3_date: Optional[str] = None  # Date stage 3 was logged

class ImplantStageUpdate(BaseModel):
    current_stage: Optional[int] = None
    osseointegration_days: Optional[int] = None
    stage_2_date: Optional[str] = None
    stage_3_date: Optional[str] = None

class FPDCreate(BaseModel):
    patient_id: str
    tooth_numbers: List[int]
    prosthetic_loading_date: Optional[str] = None
    crown_count: str = "Single"  # Single / Multiple
    connected_implant_ids: Optional[List[str]] = []
    crown_type: str = "Screw Retained"  # Cement Retained / Screw Retained
    crown_material: str = "Zirconia"  # Metal / Porcelain fused to metal / Zirconia
    clinical_notes: Optional[str] = None
    clinic_id: Optional[str] = None

class ProfileUpdate(BaseModel):
    college: Optional[str] = None
    college_place: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    currency: Optional[str] = None

# Auth Endpoints
@api_router.post("/auth/register")
async def register(doctor: DoctorRegister, response: Response):
    email_lower = doctor.email.lower()
    existing = await db.users.find_one({"email": email_lower})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = hash_password(doctor.password)
    user_doc = {
        "email": email_lower,
        "password_hash": password_hash,
        "name": doctor.name,
        "phone": doctor.phone,
        "country": doctor.country,
        "registration_number": doctor.registration_number,
        "college": doctor.college,
        "specialization": doctor.specialization,
        "profile_picture": doctor.profile_picture,
        "role": "doctor",
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email_lower)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    user_doc["_id"] = user_id
    user_doc.pop("password_hash")
    return user_doc

@api_router.post("/auth/login")
async def login(credentials: DoctorLogin, response: Response):
    email_lower = credentials.email.lower()
    user = await db.users.find_one({"email": email_lower})
    
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email_lower)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    user["_id"] = user_id
    user.pop("password_hash")
    return user

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

# Patient Endpoints
@api_router.post("/patients")
async def create_patient(patient: PatientCreate, request: Request):
    user = await get_current_user(request)
    patient_doc = patient.model_dump()
    patient_doc["doctor_id"] = user["_id"]
    patient_doc["created_at"] = datetime.now(timezone.utc)
    
    result = await db.patients.insert_one(patient_doc)
    patient_doc["_id"] = str(result.inserted_id)
    return patient_doc

@api_router.get("/patients")
async def get_patients(request: Request):
    user = await get_current_user(request)
    patients = await db.patients.find({"doctor_id": user["_id"]}, {"password_hash": 0}).to_list(1000)
    for patient in patients:
        patient["_id"] = str(patient["_id"])
    return patients

@api_router.get("/patients/{patient_id}")
async def get_patient(patient_id: str, request: Request):
    user = await get_current_user(request)
    try:
        patient = await db.patients.find_one({"_id": ObjectId(patient_id), "doctor_id": user["_id"]})
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        patient["_id"] = str(patient["_id"])
        return patient
    except:
        raise HTTPException(status_code=404, detail="Patient not found")

@api_router.put("/patients/{patient_id}")
async def update_patient(patient_id: str, patient: PatientCreate, request: Request):
    user = await get_current_user(request)
    try:
        result = await db.patients.update_one(
            {"_id": ObjectId(patient_id), "doctor_id": user["_id"]},
            {"$set": patient.model_dump()}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Patient not found")
        return {"message": "Patient updated successfully"}
    except:
        raise HTTPException(status_code=404, detail="Patient not found")

# Clinic Endpoints
@api_router.post("/clinics")
async def create_clinic(clinic: ClinicCreate, request: Request):
    user = await get_current_user(request)
    clinic_doc = clinic.model_dump()
    clinic_doc["doctor_id"] = user["_id"]
    clinic_doc["created_at"] = datetime.now(timezone.utc)
    
    result = await db.clinics.insert_one(clinic_doc)
    clinic_doc["_id"] = str(result.inserted_id)
    return clinic_doc

@api_router.get("/clinics")
async def get_clinics(request: Request):
    user = await get_current_user(request)
    clinics = await db.clinics.find({"doctor_id": user["_id"]}).to_list(100)
    for clinic in clinics:
        clinic["_id"] = str(clinic["_id"])
    return clinics

# Implant Endpoints
@api_router.post("/implants")
async def create_implant(implant: ImplantCreate, request: Request):
    user = await get_current_user(request)
    implant_doc = implant.model_dump()
    implant_doc["doctor_id"] = user["_id"]
    implant_doc["created_at"] = datetime.now(timezone.utc)
    implant_doc["osseointegration_date"] = datetime.now(timezone.utc) + timedelta(days=90)
    implant_doc["status"] = implant_doc.get("implant_outcome", "Pending")
    
    # Generate case number if not provided
    if not implant_doc.get("case_number"):
        year = datetime.now().year
        count = await db.implants.count_documents({"doctor_id": user["_id"]}) + 1
        implant_doc["case_number"] = f"IMPLANT-{year}-{count:03d}"
    
    # Initialize photo and radiograph arrays
    implant_doc["clinical_photos"] = []
    implant_doc["radiographs"] = []
    
    result = await db.implants.insert_one(implant_doc)
    implant_doc["_id"] = str(result.inserted_id)
    return implant_doc

@api_router.get("/implants")
async def get_implants(request: Request, patient_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {"doctor_id": user["_id"]}
    if patient_id:
        query["patient_id"] = patient_id
    
    implants = await db.implants.find(query).to_list(1000)
    for implant in implants:
        implant["_id"] = str(implant["_id"])
    return implants

@api_router.get("/implants/due-for-second-stage")
async def get_implants_due_for_second_stage(request: Request):
    """Return stage-1 implants whose osseointegration period has elapsed."""
    user = await get_current_user(request)
    today = datetime.now(timezone.utc)

    stage1_implants = await db.implants.find({
        "doctor_id": user["_id"],
        "$or": [{"current_stage": 1}, {"current_stage": {"$exists": False}}],
        "surgery_date": {"$exists": True, "$ne": None, "$ne": ""},
    }).to_list(1000)

    due = []
    for implant in stage1_implants:
        surgery_date_str = implant.get("surgery_date")
        if not surgery_date_str:
            continue
        try:
            surgery_date = datetime.fromisoformat(surgery_date_str)
            if surgery_date.tzinfo is None:
                surgery_date = surgery_date.replace(tzinfo=timezone.utc)
        except Exception:
            continue

        osseo_days = implant.get("osseointegration_days", 90)
        days_elapsed = (today - surgery_date).days
        if days_elapsed >= osseo_days:
            patient_name = "Unknown"
            patient_id_str = None
            try:
                patient = await db.patients.find_one({"_id": ObjectId(implant["patient_id"])})
                if patient:
                    patient_name = patient["name"]
                    patient_id_str = str(patient["_id"])
            except Exception:
                pass

            due.append({
                "implant_id": str(implant["_id"]),
                "tooth_number": implant.get("tooth_number"),
                "brand": implant.get("brand"),
                "patient_name": patient_name,
                "patient_id": patient_id_str,
                "days_elapsed": days_elapsed,
                "osseointegration_days": osseo_days,
                "surgery_date": surgery_date_str,
                "case_number": implant.get("case_number"),
            })

    return due

@api_router.get("/implants/{implant_id}")
async def get_implant(implant_id: str, request: Request):
    user = await get_current_user(request)
    try:
        implant = await db.implants.find_one({"_id": ObjectId(implant_id), "doctor_id": user["_id"]})
        if not implant:
            raise HTTPException(status_code=404, detail="Implant not found")
        implant["_id"] = str(implant["_id"])
        return implant
    except:
        raise HTTPException(status_code=404, detail="Implant not found")

@api_router.patch("/implants/{implant_id}/stage")
async def update_implant_stage(implant_id: str, update: ImplantStageUpdate, request: Request):
    """Advance treatment stage or edit osseointegration days for a single implant."""
    user = await get_current_user(request)
    # Only include fields that were explicitly sent in the request body
    patch = update.model_dump(exclude_unset=True)
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        obj_id = ObjectId(implant_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid implant ID")
    result = await db.implants.update_one(
        {"_id": obj_id, "doctor_id": user["_id"]},
        {"$set": patch}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Implant not found")
    return {"message": "Stage updated successfully"}

@api_router.put("/implants/{implant_id}")
async def update_implant(implant_id: str, implant: ImplantCreate, request: Request):
    user = await get_current_user(request)
    try:
        result = await db.implants.update_one(
            {"_id": ObjectId(implant_id), "doctor_id": user["_id"]},
            {"$set": implant.model_dump()}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Implant not found")
        return {"message": "Implant updated successfully"}
    except:
        raise HTTPException(status_code=404, detail="Implant not found")

# File Upload Endpoints

# FPD Record Endpoints
@api_router.post("/fpd-records")
async def create_fpd_record(fpd: FPDCreate, request: Request):
    user = await get_current_user(request)
    fpd_doc = fpd.model_dump()
    fpd_doc["doctor_id"] = user["_id"]
    fpd_doc["created_at"] = datetime.now(timezone.utc)

    year = datetime.now().year
    count = await db.fpd_records.count_documents({"doctor_id": user["_id"]}) + 1
    fpd_doc["case_number"] = f"FPD-{year}-{count:03d}"

    result = await db.fpd_records.insert_one(fpd_doc)
    fpd_doc["_id"] = str(result.inserted_id)
    return fpd_doc

@api_router.get("/fpd-records")
async def get_fpd_records(request: Request, patient_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {"doctor_id": user["_id"]}
    if patient_id:
        query["patient_id"] = patient_id
    records = await db.fpd_records.find(query).to_list(1000)
    for r in records:
        r["_id"] = str(r["_id"])
    return records

@api_router.delete("/fpd-records/{record_id}")
async def delete_fpd_record(record_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.fpd_records.delete_one({"_id": ObjectId(record_id), "doctor_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="FPD record not found")
    return {"message": "FPD record deleted"}

# Profile Update Endpoint
@api_router.put("/auth/profile")
async def update_profile(profile: ProfileUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in profile.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": update_data})
    updated = await db.users.find_one({"_id": ObjectId(user["_id"])})
    updated["_id"] = str(updated["_id"])
    updated.pop("password_hash", None)
    return updated

@api_router.post("/implants/{implant_id}/photos")
async def upload_photo(
    implant_id: str,
    file: UploadFile = File(...),
    view_type: str = Query(...),
    request: Request = None
):
    user = await get_current_user(request)
    
    # Verify implant belongs to doctor
    implant = await db.implants.find_one({"_id": ObjectId(implant_id), "doctor_id": user["_id"]})
    if not implant:
        raise HTTPException(status_code=404, detail="Implant not found")
    
    # Upload to storage
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    path = f"{APP_NAME}/implants/{implant_id}/photos/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "image/jpeg")
    
    # Store reference in database
    photo_doc = {
        "id": str(uuid.uuid4()),
        "implant_id": implant_id,
        "storage_path": result["path"],
        "view_type": view_type,
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result["size"],
        "uploaded_at": datetime.now(timezone.utc)
    }
    
    await db.implants.update_one(
        {"_id": ObjectId(implant_id)},
        {"$push": {"clinical_photos": photo_doc}}
    )
    
    return photo_doc

@api_router.post("/implants/{implant_id}/radiographs")
async def upload_radiograph(
    implant_id: str,
    file: UploadFile = File(...),
    view_type: str = Query(...),
    request: Request = None
):
    user = await get_current_user(request)
    
    # Verify implant belongs to doctor
    implant = await db.implants.find_one({"_id": ObjectId(implant_id), "doctor_id": user["_id"]})
    if not implant:
        raise HTTPException(status_code=404, detail="Implant not found")
    
    # Upload to storage
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    path = f"{APP_NAME}/implants/{implant_id}/radiographs/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "image/jpeg")
    
    # Store reference in database
    radiograph_doc = {
        "id": str(uuid.uuid4()),
        "implant_id": implant_id,
        "storage_path": result["path"],
        "view_type": view_type,
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result["size"],
        "uploaded_at": datetime.now(timezone.utc)
    }
    
    await db.implants.update_one(
        {"_id": ObjectId(implant_id)},
        {"$push": {"radiographs": radiograph_doc}}
    )
    
    return radiograph_doc

@api_router.get("/files/{file_path:path}")
async def download_file(
    file_path: str,
    authorization: str = Header(None),
    auth: str = Query(None),
    request: Request = None
):
    # Support cookie auth (for <img src> requests), Bearer header, or query param
    cookie_token = request.cookies.get("access_token") if request else None
    if not authorization and not auth and not cookie_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        # Get file from storage
        data, content_type = get_object(file_path)
        return Response(content=data, media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not found")

# Analytics Endpoints
@api_router.get("/analytics/overview")
async def get_analytics_overview(request: Request):
    user = await get_current_user(request)
    
    total_patients = await db.patients.count_documents({"doctor_id": user["_id"]})
    total_implants = await db.implants.count_documents({"doctor_id": user["_id"]})
    total_clinics = await db.clinics.count_documents({"doctor_id": user["_id"]})
    
    # Implants by type
    implant_types = await db.implants.aggregate([
        {"$match": {"doctor_id": user["_id"]}},
        {"$group": {"_id": "$implant_type", "count": {"$sum": 1}}}
    ]).to_list(100)
    
    # Pending osseointegration
    pending_osseo = await db.implants.count_documents({
        "doctor_id": user["_id"],
        "status": "healing",
        "osseointegration_date": {"$gte": datetime.now(timezone.utc)}
    })
    
    return {
        "total_patients": total_patients,
        "total_implants": total_implants,
        "total_clinics": total_clinics,
        "implant_types": implant_types,
        "pending_osseointegration": pending_osseo
    }

@api_router.get("/analytics/brand-surgeon-summary")
async def get_brand_surgeon_summary(request: Request):
    user = await get_current_user(request)
    
    # Brand analysis
    brand_analysis = await db.implants.aggregate([
        {"$match": {"doctor_id": user["_id"]}},
        {"$group": {
            "_id": "$brand",
            "count": {"$sum": 1},
            "systems": {"$addToSet": "$implant_system"},
            "avg_torque": {"$avg": "$insertion_torque"},
            "avg_isq": {"$avg": "$isq_value"}
        }},
        {"$sort": {"count": -1}}
    ]).to_list(100)
    
    total_implants = await db.implants.count_documents({"doctor_id": user["_id"]})
    
    # Add percentage
    for brand in brand_analysis:
        brand["percentage"] = round((brand["count"] / total_implants * 100), 2) if total_implants > 0 else 0
        brand["systems"] = [s for s in brand["systems"] if s]  # Filter out None
    
    # Surgeon analysis
    surgeon_analysis = await db.implants.aggregate([
        {"$match": {"doctor_id": user["_id"]}},
        {"$group": {
            "_id": "$surgeon_name",
            "implants_placed": {"$sum": 1},
            "sites_used": {"$addToSet": "$tooth_number"},
            "brands_used": {"$addToSet": "$brand"}
        }},
        {"$sort": {"implants_placed": -1}}
    ]).to_list(100)
    
    for surgeon in surgeon_analysis:
        surgeon["percentage"] = round((surgeon["implants_placed"] / total_implants * 100), 2) if total_implants > 0 else 0
        surgeon["unique_sites"] = len(surgeon["sites_used"])
        surgeon["brands_used"] = [b for b in surgeon["brands_used"] if b]
    
    return {
        "brands": brand_analysis,
        "surgeons": surgeon_analysis,
        "total_implants": total_implants
    }

@api_router.get("/analytics/site-usage")
async def get_site_usage_analysis(request: Request):
    user = await get_current_user(request)
    
    # Site analysis with arch and jaw region
    site_analysis = await db.implants.aggregate([
        {"$match": {"doctor_id": user["_id"]}},
        {"$group": {
            "_id": {
                "tooth_number": "$tooth_number",
                "arch": "$arch",
                "jaw_region": "$jaw_region"
            },
            "count": {"$sum": 1},
            "last_surgery": {"$max": "$surgery_date"},
            "brands": {"$addToSet": "$brand"}
        }},
        {"$sort": {"count": -1}}
    ]).to_list(100)
    
    total_implants = await db.implants.count_documents({"doctor_id": user["_id"]})
    
    for site in site_analysis:
        site["percentage"] = round((site["count"] / total_implants * 100), 2) if total_implants > 0 else 0
        site["tooth_number"] = site["_id"]["tooth_number"]
        site["arch"] = site["_id"]["arch"]
        site["jaw_region"] = site["_id"]["jaw_region"]
        site["brands"] = [b for b in site["brands"] if b]
        del site["_id"]
    
    return {
        "sites": site_analysis,
        "total_implants": total_implants
    }

@api_router.get("/analytics/dimension-analysis")
async def get_dimension_analysis(request: Request):
    user = await get_current_user(request)
    
    # Diameter analysis
    diameter_analysis = await db.implants.aggregate([
        {"$match": {"doctor_id": user["_id"], "diameter_mm": {"$ne": None}}},
        {"$group": {
            "_id": "$diameter_mm",
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]).to_list(100)
    
    # Length analysis
    length_analysis = await db.implants.aggregate([
        {"$match": {"doctor_id": user["_id"], "length_mm": {"$ne": None}}},
        {"$group": {
            "_id": "$length_mm",
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]).to_list(100)
    
    # Combination matrix
    combination_matrix = await db.implants.aggregate([
        {"$match": {"doctor_id": user["_id"], "diameter_mm": {"$ne": None}, "length_mm": {"$ne": None}}},
        {"$group": {
            "_id": {
                "diameter": "$diameter_mm",
                "length": "$length_mm"
            },
            "count": {"$sum": 1}
        }}
    ]).to_list(500)
    
    total_implants = await db.implants.count_documents({"doctor_id": user["_id"]})
    
    # Add percentages
    for diam in diameter_analysis:
        diam["percentage"] = round((diam["count"] / total_implants * 100), 2) if total_implants > 0 else 0
        diam["diameter"] = diam["_id"]
        del diam["_id"]
    
    for length in length_analysis:
        length["percentage"] = round((length["count"] / total_implants * 100), 2) if total_implants > 0 else 0
        length["length"] = length["_id"]
        del length["_id"]
    
    # Format matrix for easy consumption
    matrix = {}
    for combo in combination_matrix:
        diam = combo["_id"]["diameter"]
        length = combo["_id"]["length"]
        if diam not in matrix:
            matrix[diam] = {}
        matrix[diam][length] = combo["count"]
    
    return {
        "diameters": diameter_analysis,
        "lengths": length_analysis,
        "matrix": matrix,
        "total_implants": total_implants
    }

@api_router.get("/analytics/financial")
async def get_financial_analytics(request: Request):
    user = await get_current_user(request)
    
    # Mock financial data - in production, you'd track costs and revenue
    implants = await db.implants.find({"doctor_id": user["_id"]}).to_list(1000)
    
    # Sample cost per implant type
    costs = {
        "single": 1500,
        "bridge": 4500,
        "full_mouth": 25000
    }
    
    total_revenue = 0
    for implant in implants:
        implant_type = implant.get("implant_type", "single").lower()
        total_revenue += costs.get(implant_type, 1500)
    
    return {
        "total_revenue": total_revenue,
        "total_implants": len(implants),
        "average_per_implant": total_revenue / len(implants) if len(implants) > 0 else 0
    }

app.include_router(api_router)

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info(f"Local file storage ready at: {UPLOAD_DIR}")

    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.patients.create_index("doctor_id")
    await db.implants.create_index("doctor_id")
    await db.implants.create_index("patient_id")
    await db.clinics.create_index("doctor_id")
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@dentalapp.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin User",
            "phone": "+1234567890",
            "country": "USA",
            "registration_number": "ADMIN001",
            "college": "Admin College",
            "specialization": "General Dentistry",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
    
    # Create demo doctor and patients
    demo_doctor_email = "doctor@dentalapp.com"
    demo_doctor = await db.users.find_one({"email": demo_doctor_email})
    
    if not demo_doctor:
        demo_doctor_pass = hash_password("doctor123")
        demo_result = await db.users.insert_one({
            "email": demo_doctor_email,
            "password_hash": demo_doctor_pass,
            "name": "Dr. Sarah Johnson",
            "phone": "+1555123456",
            "country": "USA",
            "registration_number": "DDS12345",
            "college": "Harvard School of Dental Medicine",
            "specialization": "Implantology",
            "role": "doctor",
            "created_at": datetime.now(timezone.utc)
        })
        demo_doctor_id = str(demo_result.inserted_id)
        
        # Create demo clinic
        clinic_result = await db.clinics.insert_one({
            "name": "Downtown Dental Clinic",
            "address": "123 Main St, New York, NY 10001",
            "phone": "+1555999888",
            "email": "info@downtowndental.com",
            "doctor_id": demo_doctor_id,
            "created_at": datetime.now(timezone.utc)
        })
        clinic_id = str(clinic_result.inserted_id)
        
        # Create demo patients
        patient1_result = await db.patients.insert_one({
            "name": "John Smith",
            "age": 45,
            "gender": "Male",
            "phone": "+1555111222",
            "email": "john.smith@email.com",
            "address": "456 Oak Ave, New York, NY",
            "medical_history": "Hypertension, controlled with medication",
            "doctor_id": demo_doctor_id,
            "created_at": datetime.now(timezone.utc)
        })
        
        patient2_result = await db.patients.insert_one({
            "name": "Emma Williams",
            "age": 38,
            "gender": "Female",
            "phone": "+1555333444",
            "email": "emma.w@email.com",
            "address": "789 Pine St, New York, NY",
            "medical_history": "No significant medical history",
            "doctor_id": demo_doctor_id,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Create demo implants
        await db.implants.insert_one({
            "patient_id": str(patient1_result.inserted_id),
            "tooth_number": 14,
            "implant_type": "Single",
            "brand": "Straumann",
            "size": "4.1mm",
            "length": "10mm",
            "insertion_torque": 35.0,
            "connection_type": "Internal Hex",
            "surgical_approach": "Immediate Placement",
            "bone_graft": "Xenograft",
            "sinus_lift_type": None,
            "is_pterygoid": False,
            "is_zygomatic": False,
            "is_subperiosteal": False,
            "clinic_id": clinic_id,
            "doctor_id": demo_doctor_id,
            "created_at": datetime.now(timezone.utc) - timedelta(days=30),
            "osseointegration_date": datetime.now(timezone.utc) + timedelta(days=60),
            "status": "healing",
            "notes": "Primary stability achieved, no complications"
        })
        
        await db.implants.insert_one({
            "patient_id": str(patient2_result.inserted_id),
            "tooth_number": 26,
            "implant_type": "Single",
            "brand": "Nobel Biocare",
            "size": "4.3mm",
            "length": "13mm",
            "insertion_torque": 40.0,
            "connection_type": "Conical",
            "surgical_approach": "Delayed Placement",
            "bone_graft": None,
            "sinus_lift_type": "Indirect",
            "is_pterygoid": False,
            "is_zygomatic": False,
            "is_subperiosteal": False,
            "clinic_id": clinic_id,
            "doctor_id": demo_doctor_id,
            "created_at": datetime.now(timezone.utc) - timedelta(days=15),
            "osseointegration_date": datetime.now(timezone.utc) + timedelta(days=75),
            "status": "healing",
            "notes": "Sinus lift performed successfully"
        })
    
    logger.info("Startup complete. Demo accounts: admin@dentalapp.com / admin123, doctor@dentalapp.com / doctor123")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()