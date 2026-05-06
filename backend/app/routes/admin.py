from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.dependencies import require_role
from app.utils.security import hash_password
from sqlalchemy import text

router = APIRouter()


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
    password: str,
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

    hashed_pw = hash_password(password)

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
    return {
        "message":    "Doctor created successfully",
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
