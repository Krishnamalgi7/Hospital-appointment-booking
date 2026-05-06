from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.dependencies import require_role
from sqlalchemy import text

router = APIRouter()

# ─── GET /doctor/profile ──────────────────────────────────────────────────────
@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db),
    user=Depends(require_role("doctor"))
):
    query = """
        SELECT u.name, d.specialization, 
               COALESCE(h.name, d.hospital_name) as hospital_name
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN hospitals h ON d.hospital_id = h.id
        WHERE d.user_id = :user_id
    """
    result = db.execute(text(query), {"user_id": user["user_id"]}).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return dict(result._mapping)


# ─── EXISTING: Doctor view appointments ───────────────────────────────────────
@router.get("/appointments")
def get_appointments(
    db: Session = Depends(get_db),
    user=Depends(require_role("doctor"))
):
    result = db.execute(text("""
    SELECT a.id, a.appointment_date, a.status,
           p.id as patient_id, u.name as patient_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE a.doctor_id = (
        SELECT id FROM doctors WHERE user_id = :user_id
    )
    ORDER BY a.appointment_date DESC
"""), {"user_id": user["user_id"]}).fetchall()

    return [dict(row._mapping) for row in result]


# ─── EXISTING: Doctor add medical record ──────────────────────────────────────
@router.post("/add-record")
def add_medical_record(
    patient_id: int,
    diagnosis: str,
    medicines: str,
    next_visit_date: str,
    db: Session = Depends(get_db),
    user=Depends(require_role("doctor"))
):
    doctor = db.execute(text("""
        SELECT id FROM doctors WHERE user_id = :user_id
    """), {"user_id": user["user_id"]}).fetchone()

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    db.execute(text("""
        INSERT INTO medical_records (patient_id, doctor_id, diagnosis, medicines, next_visit_date)
        VALUES (:patient_id, :doctor_id, :diagnosis, :medicines, :next_visit_date)
    """), {
        "patient_id":     patient_id,
        "doctor_id":      doctor.id,
        "diagnosis":      diagnosis,
        "medicines":      medicines,
        "next_visit_date": next_visit_date
    })

    db.commit()
    return {"message": "Medical record added"}


# ─── EXISTING: Public list of all doctors (booking dropdown) ──────────────────
@router.get("/list")
def list_doctors(hospital_id: int = None, db: Session = Depends(get_db)):
    query = """
        SELECT d.id, u.name, d.specialization, d.hospital_name, d.phone, d.status
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        WHERE d.status = 'active'
    """
    params = {}
    if hospital_id:
        query += " AND d.hospital_id = :hospital_id"
        params["hospital_id"] = hospital_id
        
    query += " ORDER BY u.name"
    
    result = db.execute(text(query), params).fetchall()
    return [dict(row._mapping) for row in result]


# ─── GET /doctor/stats ────────────────────────────────────────────────────────
# Returns total_appointments, pending, completed, cancelled
@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    user=Depends(require_role("doctor"))
):
    result = db.execute(text("""
        SELECT
            COUNT(*) AS total_appointments,
            SUM(CASE WHEN status = 'booked'    THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
        FROM appointments
        WHERE doctor_id = (SELECT id FROM doctors WHERE user_id = :user_id)
    """), {"user_id": user["user_id"]}).fetchone()

    row = dict(result._mapping)
    # Ensure numeric values (MySQL SUM can return None when table is empty)
    return {
        "total_appointments": int(row.get("total_appointments") or 0),
        "pending":            int(row.get("pending")            or 0),
        "completed":          int(row.get("completed")          or 0),
        "cancelled":          int(row.get("cancelled")          or 0),
    }


# ─── PATCH /doctor/update-status/{appointment_id} (existing) ─────────────────
@router.patch("/update-status/{appointment_id}")
def update_appointment_status_patch(
    appointment_id: int,
    status: str,
    db: Session = Depends(get_db),
    user=Depends(require_role("doctor"))
):
    return _do_update_status(appointment_id, status, db, user)


# ─── PUT /doctor/update-status (new — query params) ──────────────────────────
@router.put("/update-status")
def update_appointment_status_put(
    appointment_id: int,
    status: str,
    db: Session = Depends(get_db),
    user=Depends(require_role("doctor"))
):
    return _do_update_status(appointment_id, status, db, user)


# ─── Shared update logic ───────────────────────────────────────────────────────
def _do_update_status(appointment_id: int, status: str, db: Session, user: dict):
    if status not in ("completed", "cancelled", "booked"):
        raise HTTPException(status_code=400, detail="Invalid status. Use: booked, completed, cancelled")

    doctor = db.execute(text("""
        SELECT id FROM doctors WHERE user_id = :user_id
    """), {"user_id": user["user_id"]}).fetchone()

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    appt = db.execute(text("""
        SELECT id FROM appointments
        WHERE id = :appt_id AND doctor_id = :doctor_id
    """), {"appt_id": appointment_id, "doctor_id": doctor.id}).fetchone()

    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    db.execute(text("""
        UPDATE appointments SET status = :status WHERE id = :appt_id
    """), {"status": status, "appt_id": appointment_id})

    db.commit()
    return {"message": f"Appointment marked as {status}"}