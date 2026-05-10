from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.dependencies import require_role
from app.utils.security import hash_password
from app.utils.password import generate_temp_password
from app.utils.email import send_doctor_credentials
from sqlalchemy import text

router = APIRouter()

class ScheduleUpdate(BaseModel):
    start_time: str
    end_time: str
    slot_interval: int
    break_start: Optional[str] = None
    break_end: Optional[str] = None


# ─── POST /admin/create-hospital ──────────────────────────────────────────────
@router.post("/create-hospital")
def create_hospital(
    name: str,
    location: str = "",
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    # Prevent duplicate hospital names
    existing = db.execute(text("""
        SELECT id FROM hospitals WHERE name = :name
    """), {"name": name}).fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="Hospital with this name already exists")

    result = db.execute(text("""
        INSERT INTO hospitals (name, location) VALUES (:name, :location)
    """), {"name": name, "location": location})

    db.commit()
    return {"message": "Hospital created", "hospital_id": result.lastrowid}


# ─── GET /admin/hospitals ──────────────────────────────────────────────────────
@router.get("/hospitals")
def list_hospitals(
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    result = db.execute(text("""
        SELECT h.id, h.name, h.location,
               COUNT(d.id) AS doctor_count
        FROM hospitals h
        LEFT JOIN doctors d ON d.hospital_id = h.id
        GROUP BY h.id, h.name, h.location
        ORDER BY h.name
    """)).fetchall()
    return [dict(row._mapping) for row in result]


# ─── POST /admin/create-doctor ────────────────────────────────────────────────
@router.post("/create-doctor")
def create_doctor(
    name: str,
    email: str,
    specialization: str,
    hospital_id: int,
    phone: str = "",
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    # Check email uniqueness
    existing_user = db.execute(text("""
        SELECT id FROM users WHERE email = :email
    """), {"email": email}).fetchone()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check hospital exists
    hospital = db.execute(text("""
        SELECT id, name FROM hospitals WHERE id = :hid
    """), {"hid": hospital_id}).fetchone()

    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    temp_password = generate_temp_password()
    hashed_pw = hash_password(temp_password)

    # Insert into users with role=doctor
    user_result = db.execute(text("""
        INSERT INTO users (name, email, password_hash, role)
        VALUES (:name, :email, :password, 'doctor')
    """), {"name": name, "email": email, "password": hashed_pw})

    new_user_id = user_result.lastrowid

    # Insert into doctors
    db.execute(text("""
        INSERT INTO doctors (user_id, specialization, hospital_name, hospital_id, phone)
        VALUES (:user_id, :specialization, :hospital_name, :hospital_id, :phone)
    """), {
        "user_id":       new_user_id,
        "specialization": specialization,
        "hospital_name":  hospital.name,   # keep hospital_name text in sync
        "hospital_id":    hospital_id,
        "phone":          phone
    })

    db.commit()
    
    # Try sending email
    email_sent = send_doctor_credentials(email, name, temp_password, hospital.name)

    return {
        "message":    "Doctor created successfully",
        "email_sent": email_sent,
        "user_id":    new_user_id,
        "email":      email,
        "hospital":   hospital.name
    }


# ─── GET /admin/doctors ───────────────────────────────────────────────────────
@router.get("/doctors")
def list_all_doctors(
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    result = db.execute(text("""
        SELECT
            d.id,
            u.id   AS user_id,
            u.name,
            u.email,
            d.specialization,
            d.phone,
            d.hospital_name,
            h.id   AS hospital_id,
            h.name AS hospital_linked,
            h.location
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN hospitals h ON d.hospital_id = h.id
        ORDER BY u.name
    """)).fetchall()
    return [dict(row._mapping) for row in result]


# ─── GET /admin/stats ─────────────────────────────────────────────────────────
@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    hospitals = db.execute(text("SELECT COUNT(*) AS cnt FROM hospitals")).fetchone()
    doctors   = db.execute(text("SELECT COUNT(*) AS cnt FROM doctors")).fetchone()
    patients  = db.execute(text("SELECT COUNT(*) AS cnt FROM patients")).fetchone()
    appts     = db.execute(text("SELECT COUNT(*) AS cnt FROM appointments")).fetchone()

    return {
        "total_hospitals": hospitals.cnt,
        "total_doctors":   doctors.cnt,
        "total_patients":  patients.cnt,
        "total_appointments": appts.cnt,
    }

# ─── PUT /admin/update-hospital/{hospital_id} ─────────────────────────────────
@router.put("/update-hospital/{hospital_id}")
def update_hospital(
    hospital_id: int,
    name: str,
    location: str = "",
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    hospital = db.execute(text("SELECT id FROM hospitals WHERE id = :id"), {"id": hospital_id}).fetchone()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    db.execute(text("UPDATE hospitals SET name = :name, location = :loc WHERE id = :id"),
               {"name": name, "loc": location, "id": hospital_id})
               
    # Sync hospital_name in doctors table
    db.execute(text("UPDATE doctors SET hospital_name = :name WHERE hospital_id = :id"),
               {"name": name, "id": hospital_id})
               
    db.commit()
    return {"message": "Hospital updated successfully"}

# ─── GET /admin/hospital-schedule/{hospital_id} ───────────────────────────────
@router.get("/hospital-schedule/{hospital_id}")
def get_hospital_schedule(
    hospital_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    schedule = db.execute(text("""
        SELECT start_time, end_time, slot_interval, break_start, break_end 
        FROM hospital_schedules 
        WHERE hospital_id = :hid
    """), {"hid": hospital_id}).fetchone()
    
    if schedule:
        return dict(schedule._mapping)
    return {} # Return empty if no schedule

# ─── PUT /admin/hospital-schedule/{hospital_id} ───────────────────────────────
@router.put("/hospital-schedule/{hospital_id}")
def update_hospital_schedule(
    hospital_id: int,
    payload: ScheduleUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    hospital = db.execute(text("SELECT id FROM hospitals WHERE id = :id"), {"id": hospital_id}).fetchone()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    existing = db.execute(text("SELECT id FROM hospital_schedules WHERE hospital_id = :hid"), {"hid": hospital_id}).fetchone()
    
    if existing:
        db.execute(text("""
            UPDATE hospital_schedules 
            SET start_time = :st, end_time = :et, slot_interval = :si, 
                break_start = :bs, break_end = :be
            WHERE hospital_id = :hid
        """), {
            "st": payload.start_time, "et": payload.end_time, "si": payload.slot_interval,
            "bs": payload.break_start or None, "be": payload.break_end or None, "hid": hospital_id
        })
    else:
        db.execute(text("""
            INSERT INTO hospital_schedules (hospital_id, start_time, end_time, slot_interval, break_start, break_end)
            VALUES (:hid, :st, :et, :si, :bs, :be)
        """), {
            "hid": hospital_id, "st": payload.start_time, "et": payload.end_time, "si": payload.slot_interval,
            "bs": payload.break_start or None, "be": payload.break_end or None
        })
        
    db.commit()
    return {"message": "Schedule updated successfully"}

# ─── DELETE /admin/delete-hospital/{hospital_id} ──────────────────────────────
@router.delete("/delete-hospital/{hospital_id}")
def delete_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    hospital = db.execute(text("SELECT id FROM hospitals WHERE id = :id"), {"id": hospital_id}).fetchone()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    doctors = db.execute(text("SELECT id FROM doctors WHERE hospital_id = :id"), {"id": hospital_id}).fetchall()
    if doctors:
        raise HTTPException(status_code=400, detail="Cannot delete hospital with active doctors assigned.")
        
    db.execute(text("DELETE FROM hospitals WHERE id = :id"), {"id": hospital_id})
    db.commit()
    return {"message": "Hospital deleted successfully"}

# ─── PUT /admin/update-doctor/{doctor_id} ─────────────────────────────────────
@router.put("/update-doctor/{doctor_id}")
def update_doctor(
    doctor_id: int,
    name: str,
    specialization: str,
    hospital_id: int,
    phone: str = "",
    status: str = "active",
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    doctor = db.execute(text("SELECT id, user_id FROM doctors WHERE id = :id"), {"id": doctor_id}).fetchone()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    hospital = db.execute(text("SELECT name FROM hospitals WHERE id = :id"), {"id": hospital_id}).fetchone()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    db.execute(text("UPDATE users SET name = :name WHERE id = :uid"), {"name": name, "uid": doctor.user_id})
    db.execute(text("""
        UPDATE doctors 
        SET specialization = :spec, hospital_id = :hid, hospital_name = :hname, phone = :phone, status = :status
        WHERE id = :id
    """), {
        "spec": specialization, "hid": hospital_id, "hname": hospital.name, 
        "phone": phone, "status": status, "id": doctor_id
    })
    db.commit()
    return {"message": "Doctor updated successfully"}

# ─── DELETE /admin/delete-doctor/{doctor_id} ──────────────────────────────────
@router.delete("/delete-doctor/{doctor_id}")
def delete_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    doctor = db.execute(text("SELECT id, user_id FROM doctors WHERE id = :id"), {"id": doctor_id}).fetchone()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    # Prevent deletion if appointments or medical records exist
    appts = db.execute(text("SELECT id FROM appointments WHERE doctor_id = :id"), {"id": doctor_id}).fetchone()
    records = db.execute(text("SELECT id FROM medical_records WHERE doctor_id = :id"), {"id": doctor_id}).fetchone()
    
    if appts or records:
        raise HTTPException(status_code=400, detail="Cannot delete doctor with existing appointments or medical records.")
        
    # Safe delete if no records
    db.execute(text("DELETE FROM doctors WHERE id = :id"), {"id": doctor_id})
    db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": doctor.user_id})
    db.commit()
    return {"message": "Doctor deleted successfully"}
