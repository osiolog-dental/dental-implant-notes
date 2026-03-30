import os
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')

# Your doctor ID (will be fetched from database)
DOCTOR_EMAIL = "midhilesh.krishna@gmail.com"

# Clinic name mapping
CLINIC_MAP = {
    "hanvitha, vja": "Hanvitha Dental Clinic, Vijayawada",
    "Sri sai , Gudvd": "Sri Sai Dental, Gudivada",
    "mohan dental, avg": "Mohan Dental Clinic, Avigadda",
    "rainbow, Vuyr": "Rainbow Dental, Vijayawada",
    "vajra tenali": "Vajra Dental, Tenali",
    "nitin dental, Rajmd": "Nitin Dental, Rajahmundry",
    "balaji Sri sai , Gudvd": "Balaji Sri Sai Dental, Gudivada",
    "Ref vja from gowthami": "Gowthami Referral, Vijayawada"
}

# Patient data from your Excel
PATIENT_DATA = [
    {"sno": 1, "name": "MD javeed", "clinic": "hanvitha, vja,", "sizes": ["3.75x11.5", "4x10", "4x10", "4x10", "4x10"], "positions": ["46", "47", "36", "37"], "date": None, "brand": "Dio", "notes": "ref from nitin sir"},
    {"sno": 2, "name": "laxmi subbamma", "clinic": "Sri sai , Gudvd", "sizes": ["3.75x8", "3.75x8"], "positions": ["35", "36"], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 3, "name": "G.Gowri Sankar", "clinic": "mohan dental, avg", "sizes": ["5.3x10"], "positions": [], "date": None, "brand": "Alpha", "notes": ""},
    {"sno": 4, "name": "S Rajeswari", "clinic": "mohan dental, avg", "sizes": ["4.2x10", "3.75x10", "4.2x10"], "positions": ["36", "46", "47"], "date": None, "brand": "Alpha", "notes": ""},
    {"sno": 5, "name": "v venkata lakshmi", "clinic": "Sri sai , Gudvd", "sizes": ["4.65x8"], "positions": [], "date": None, "brand": "Alpha", "notes": ""},
    {"sno": 6, "name": "padmaja", "clinic": "Sri sai , Gudvd", "sizes": ["5.3x11.5"], "positions": [], "date": None, "brand": "Alpha", "notes": ""},
    {"sno": 7, "name": "v vijaya lakshmi", "clinic": "Sri sai , Gudvd", "sizes": ["4.2x10"], "positions": [], "date": None, "brand": "Alpha", "notes": ""},
    {"sno": 8, "name": "nafeez", "clinic": "tenali case", "sizes": ["5x10", "5x10"], "positions": ["46", "36"], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 9, "name": "ch girish kumar", "clinic": "hanvitha, vja,", "sizes": ["5x11.5"], "positions": [], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 10, "name": "annapurna", "clinic": "Sri sai , Gudvd", "sizes": ["5.3x8"], "positions": [], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 11, "name": "Sabira", "clinic": "Sri sai , Gudvd", "sizes": ["3.75x11.5", "3.75x11.5", "3.75x11.5", "3.75x11.5"], "positions": ["44", "43", "34", "33"], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 12, "name": "nafeez male", "clinic": "tenali case", "sizes": ["4.2x8"], "positions": [], "date": None, "brand": "alpha", "notes": "Male"},
    {"sno": 13, "name": "nafeez female", "clinic": "tenali case", "sizes": ["4.2x8"], "positions": [], "date": "2022-06-03", "brand": "Alpha", "notes": "Female"},
    {"sno": 14, "name": "Sabira", "clinic": "Sri sai , Gudvd", "sizes": ["3.2x10", "3.2x10"], "positions": ["12", "22"], "date": "2022-06-25", "brand": "alpha", "notes": ""},
    {"sno": 15, "name": "vijayasree", "clinic": "rainbow, Vuyr", "sizes": ["3.75x13", "3.75x13", "3.75x16", "3.75x16"], "positions": ["46", "43", "33", "36"], "date": None, "brand": "Alpha", "notes": ""},
    {"sno": 16, "name": "n sirisha", "clinic": "Sri sai , Gudvd", "sizes": ["4.2x11.5", "4.2x11.5"], "positions": ["46", "36"], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 17, "name": "n lakshmi", "clinic": "Sri sai , Gudvd", "sizes": ["5x10"], "positions": [], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 18, "name": "t parvathi", "clinic": "vajra tenali", "sizes": ["3.75x11.5", "3.75x11.5"], "positions": ["43", "33"], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 19, "name": "aruna sri", "clinic": "Sri sai , Gudvd", "sizes": ["3.75x11.5"], "positions": [], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 20, "name": "vijayasree", "clinic": "rainbow, Vuyr", "sizes": ["2.5x10", "2.5x10", "2.5x10"], "positions": ["14", "13", "23"], "date": None, "brand": "osstem", "notes": "3 implants (1F)"},
    {"sno": 21, "name": "k rajini sree", "clinic": "Sri sai , Gudvd", "sizes": ["4.2x10"], "positions": [], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 22, "name": "sekhar rao", "clinic": "Sri sai , Gudvd", "sizes": ["3.75x10"], "positions": [], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 23, "name": "b vara lakshmi", "clinic": "Sri sai , Gudvd", "sizes": ["3.75x10", "3.75x10"], "positions": ["35", "37"], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 24, "name": "k bangaru babu", "clinic": "Sri sai , Gudvd", "sizes": ["4.2x10"], "positions": [], "date": None, "brand": "Alpha", "notes": ""},
    {"sno": 25, "name": "s naga malleswari", "clinic": "Sri sai , Gudvd", "sizes": ["4.2x10"], "positions": [], "date": None, "brand": "Alpha", "notes": ""},
    {"sno": 26, "name": "k ragini", "clinic": "Sri sai , Gudvd", "sizes": ["4.2x10"], "positions": [], "date": None, "brand": "Alpha", "notes": ""},
    {"sno": 27, "name": "v ratna kumari", "clinic": "Sri sai , Gudvd", "sizes": ["4.65x6", "4.2x10"], "positions": ["46", "36"], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 28, "name": "g surya narayana", "clinic": "Sri sai , Gudvd", "sizes": ["3.2x13"], "positions": [], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 29, "name": "t shyam", "clinic": "Sri sai , Gudvd", "sizes": ["3.75x11.5", "3.75x10", "4.2x10"], "positions": ["23", "24", "46"], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 30, "name": "y madhavi", "clinic": "nitin dental, Rajmd", "sizes": ["4x10"], "positions": [], "date": None, "brand": "Dio", "notes": ""},
    {"sno": 35, "name": "K jyothi", "clinic": "rainbow, Vuyr", "sizes": ["3.2x10"], "positions": ["41"], "date": "2023-01-19", "brand": "Alpha", "notes": ""},
    {"sno": 36, "name": "Y sai", "clinic": "rainbow, Vuyr", "sizes": ["4.2x11.5"], "positions": [], "date": "2023-01-19", "brand": "alpha", "notes": ""},
    {"sno": 37, "name": "D shoba rani", "clinic": "vajra tenali", "sizes": ["4.2x11.5", "4.2x10"], "positions": ["36", "37"], "date": "2023-01-20", "brand": "alpha", "notes": ""},
    {"sno": 38, "name": "K srinivas rao", "clinic": "Sri sai , Gudvd", "sizes": ["3.2x13"], "positions": [], "date": "2023-01-27", "brand": "alpha", "notes": ""},
    {"sno": 39, "name": "Manjoor ilahi", "clinic": "Sri sai , Gudvd", "sizes": ["3.2x13"], "positions": [], "date": "2023-01-29", "brand": "alpha", "notes": ""},
    {"sno": 40, "name": "P vivek", "clinic": "Sri sai , Gudvd", "sizes": ["3.2x11.5", "3.75x11.5", "3.75x11.5", "3.75x11.5"], "positions": ["21", "23", "24", "25"], "date": None, "brand": "alpha", "notes": ""},
    {"sno": 62, "name": "Vajram", "clinic": "Sri sai , Gudvd", "sizes": ["3.75x11.5", "3.75x11.5"], "positions": ["33", "43"], "date": "2023-09-16", "brand": "alpha", "notes": ""},
    {"sno": 63, "name": "C vinay", "clinic": "Sri sai , Gudvd", "sizes": ["4.2x11.5"], "positions": [], "date": "2023-09-16", "brand": "", "notes": ""},
    {"sno": 70, "name": "G padmaja", "clinic": "Sri sai , Gudvd", "sizes": ["3.75x11.5"], "positions": [], "date": "2023-11-29", "brand": "alpha", "notes": ""},
    {"sno": 71, "name": "A sujatha", "clinic": "Sri sai , Gudvd", "sizes": ["3.75x10", "3.75x11.5", "4.65x6", "4.65x6"], "positions": ["45", "44", "43", "33"], "date": "2023-11-29", "brand": "alpha", "notes": ""},
    {"sno": 72, "name": "V padmaja", "clinic": "Sri sai , Gudvd", "sizes": ["3.2x11.5", "3.75x11.5"], "positions": ["12", "14"], "date": "2023-12-13", "brand": "alpha", "notes": ""},
    {"sno": 73, "name": "Unknown 1", "clinic": "Sri sai , Gudvd", "sizes": ["3.75x11.5", "3.75x10"], "positions": ["46", "47"], "date": "2023-12-24", "brand": "alpha", "notes": ""},
    {"sno": 74, "name": "Unknown 2", "clinic": "Sri sai , Gudvd", "sizes": ["3.2x13"], "positions": [], "date": "2023-12-24", "brand": "alpha", "notes": ""},
    {"sno": 78, "name": "Bade Divya sai", "clinic": "mohan dental, avg", "sizes": ["4.2x10"], "positions": [], "date": "2024-02-15", "brand": "alpha", "notes": ""},
    {"sno": 79, "name": "K satyavathi", "clinic": "Sri sai , Gudvd", "sizes": ["4.2x11.5"], "positions": [], "date": "2024-03-23", "brand": "alpha", "notes": ""},
    {"sno": 81, "name": "Suresh", "clinic": "Ref vja from gowthami", "sizes": ["3.75x11.5"], "positions": [], "date": "2024-04-13", "brand": "alpha", "notes": ""},
    {"sno": 82, "name": "Bulli babu", "clinic": "Sri sai , Gudvd", "sizes": ["4.2x10"], "positions": [], "date": "2024-04-19", "brand": "alpha", "notes": ""},
    {"sno": 83, "name": "Sukku bhai", "clinic": "rainbow, Vuyr", "sizes": ["3.75x11.5", "3.75x11.5", "3.75x11.5", "3.75x11.5", "3.75x11.5", "3.75x10"], "positions": ["46", "44", "43", "33", "34", "36"], "date": "2024-04-24", "brand": "alpha", "notes": "Full mouth rehabilitation"},
    {"sno": 87, "name": "seetha kumari", "clinic": "Sri sai , Gudvd", "sizes": ["3.75x11.5", "3.75x10"], "positions": ["36", "37"], "date": "2024-05-23", "brand": "alpha", "notes": ""},
    {"sno": 91, "name": "Md hannef", "clinic": "rainbow, Vuyr", "sizes": ["4.2x10", "4.2x10"], "positions": ["26", "36"], "date": "2024-07-20", "brand": "genesis", "notes": ""},
    {"sno": 92, "name": "Md hannef", "clinic": "rainbow, Vuyr", "sizes": ["4.2x8"], "positions": [], "date": "2024-08-27", "brand": "alpha", "notes": "Follow-up implant"},
    {"sno": 95, "name": "K jhansi lakshmi", "clinic": "mohan dental, avg", "sizes": ["4.2x10"], "positions": [], "date": "2024-09-19", "brand": "alpha", "notes": ""},
    {"sno": 96, "name": "Naga bhushan", "clinic": "rainbow, Vuyr", "sizes": ["4.2x10"], "positions": ["27"], "date": "2024-09-20", "brand": "alpha", "notes": ""},
    {"sno": 97, "name": "Brahmeswara rao", "clinic": "rainbow, Vuyr", "sizes": ["3.75x10"], "positions": [], "date": "2024-09-20", "brand": "genesis", "notes": ""},
    {"sno": 98, "name": "Vamsi krishna", "clinic": "rainbow, Vuyr", "sizes": ["3.5x11.5", "3.5x11.5", "4.2x11.5", "4.2x8"], "positions": ["24", "25", "36", "37"], "date": "2024-09-28", "brand": "genesis", "notes": ""},
    {"sno": 101, "name": "Abhishek", "clinic": "hanvitha, vja,", "sizes": ["3.75x10"], "positions": [], "date": "2024-10-13", "brand": "genesis", "notes": ""},
    {"sno": 102, "name": "Vamsi krishna", "clinic": "rainbow, Vuyr", "sizes": ["4.2x11.5", "4.2x8", "3.75x10"], "positions": ["46", "47", "14"], "date": "2024-10-19", "brand": "genesis", "notes": "Multiple sites"},
]

def parse_size(size_str):
    """Parse implant size string like '3.75x11.5' into diameter and length"""
    try:
        size_str = size_str.replace("mm", "").replace(" ", "").strip()
        parts = size_str.lower().split('x')
        if len(parts) == 2:
            return float(parts[0]), float(parts[1])
    except:
        pass
    return 4.0, 10.0  # default

async def import_data():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🔄 Starting data import...")
    
    # Get doctor
    doctor = await db.users.find_one({"email": DOCTOR_EMAIL})
    if not doctor:
        print(f"❌ Doctor not found: {DOCTOR_EMAIL}")
        return
    
    doctor_id = str(doctor["_id"])
    print(f"✓ Found doctor: {doctor['name']} ({doctor_id})")
    
    # Create/get clinics
    clinic_ids = {}
    for short_name, full_name in CLINIC_MAP.items():
        existing = await db.clinics.find_one({"name": full_name, "doctor_id": doctor_id})
        if existing:
            clinic_ids[short_name] = str(existing["_id"])
        else:
            result = await db.clinics.insert_one({
                "name": full_name,
                "address": f"Location: {short_name}",
                "phone": "+91-XXXXXXXXXX",
                "doctor_id": doctor_id,
                "created_at": datetime.now(timezone.utc)
            })
            clinic_ids[short_name] = str(result.inserted_id)
            print(f"✓ Created clinic: {full_name}")
    
    patients_created = 0
    implants_created = 0
    
    # Import patients and implants
    for record in PATIENT_DATA:
        # Create/get patient
        patient_name = record["name"]
        existing_patient = await db.patients.find_one({
            "name": patient_name,
            "doctor_id": doctor_id
        })
        
        if existing_patient:
            patient_id = str(existing_patient["_id"])
        else:
            # Determine gender from name/notes
            gender = "Female" if any(term in record.get("notes", "").lower() for term in ["female", "smt", "mrs"]) else "Male"
            
            patient_doc = {
                "name": patient_name,
                "age": 45,  # default age
                "gender": gender,
                "phone": "+91-XXXXXXXXXX",
                "email": f"{patient_name.replace(' ', '.').lower()}@email.com",
                "address": f"Patient from {record['clinic']}",
                "medical_history": record.get("notes", ""),
                "doctor_id": doctor_id,
                "created_at": datetime.now(timezone.utc)
            }
            result = await db.patients.insert_one(patient_doc)
            patient_id = str(result.inserted_id)
            patients_created += 1
        
        # Get clinic ID
        clinic_short = record["clinic"]
        clinic_id = clinic_ids.get(clinic_short, list(clinic_ids.values())[0] if clinic_ids else None)
        
        # Parse surgery date
        surgery_date = None
        if record.get("date"):
            try:
                surgery_date = datetime.strptime(record["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except:
                pass
        
        if not surgery_date:
            surgery_date = datetime.now(timezone.utc)
        
        # Create implants for each size/position
        sizes = record.get("sizes", [])
        positions = record.get("positions", [])
        
        # If no positions specified, use a default
        if not positions:
            positions = ["46"]  # default tooth number
        
        # Match sizes with positions
        for i, size in enumerate(sizes):
            tooth_num = int(positions[i]) if i < len(positions) else int(positions[0]) if positions else 46
            diameter, length = parse_size(size)
            
            # Check if implant already exists
            existing_implant = await db.implants.find_one({
                "patient_id": patient_id,
                "tooth_number": tooth_num,
                "doctor_id": doctor_id
            })
            
            if not existing_implant:
                implant_doc = {
                    "patient_id": patient_id,
                    "tooth_number": tooth_num,
                    "implant_type": "Full Mouth" if len(sizes) > 4 else "Bridge" if len(sizes) > 1 else "Single",
                    "brand": record.get("brand", "Alpha").title(),
                    "size": size,
                    "length": f"{length}mm",
                    "insertion_torque": 35.0,
                    "connection_type": "Internal Hex",
                    "surgical_approach": "Delayed Placement",
                    "bone_graft": None,
                    "sinus_lift_type": None,
                    "is_pterygoid": False,
                    "is_zygomatic": False,
                    "is_subperiosteal": False,
                    "notes": record.get("notes", ""),
                    "clinic_id": clinic_id,
                    "doctor_id": doctor_id,
                    "created_at": surgery_date,
                    "surgery_date": surgery_date.isoformat(),
                    "osseointegration_date": (surgery_date + timedelta(days=90)).isoformat(),
                    "status": "healing",
                    "diameter_mm": diameter,
                    "length_mm": length,
                    "case_number": f"IMPLANT-{surgery_date.year}-{record['sno']:03d}",
                    "adjunctive_procedures": [],
                    "clinical_photos": [],
                    "radiographs": []
                }
                
                await db.implants.insert_one(implant_doc)
                implants_created += 1
    
    print(f"\n✅ Import Complete!")
    print(f"   Patients created: {patients_created}")
    print(f"   Implants created: {implants_created}")
    print(f"   Clinics created: {len(clinic_ids)}")
    
    client.close()

if __name__ == "__main__":
    from datetime import timedelta
    asyncio.run(import_data())
