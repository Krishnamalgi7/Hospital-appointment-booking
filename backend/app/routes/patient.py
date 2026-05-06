from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.dependencies import require_role
from sqlalchemy import text

router = APIRouter()


# ─── EXISTING: Book appointment ───────────────────────────────────────────────
@router.post("/book")
def book_appointment(
    doctor_id: int,
    appointment_date: str,
    db: Session = Depends(get_db),
    user=Depends(require_role("patient"))
):

    patient = db.execute(text("""
        SELECT id FROM patients WHERE user_id = :user_id
    """), {"user_id": user["user_id"]}).fetchone()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    db.execute(text("""
        INSERT INTO appointments (patient_id, doctor_id, appointment_date, status)
        VALUES (:patient_id, :doctor_id, :appointment_date, 'booked')
    """), {
        "patient_id": patient.id,
        "doctor_id": doctor_id,
        "appointment_date": appointment_date
    })

    db.commit()

    return {"message": "Appointment booked"}


# ─── EXISTING: Medical history ────────────────────────────────────────────────
@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    user=Depends(require_role("patient"))
):

    patient = db.execute(text("""
        SELECT id FROM patients WHERE user_id = :user_id
    """), {"user_id": user["user_id"]}).fetchone()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    result = db.execute(text("""
        SELECT m.id, m.diagnosis, m.medicines, m.next_visit_date,
               u.name as doctor_name
        FROM medical_records m
        JOIN doctors d ON m.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        WHERE m.patient_id = :patient_id
        ORDER BY m.created_at DESC
    """), {"patient_id": patient.id}).fetchall()

    return [dict(row._mapping) for row in result]


# ─── NEW: Patient's own appointments list ─────────────────────────────────────
@router.get("/appointments")
def get_my_appointments(
    db: Session = Depends(get_db),
    user=Depends(require_role("patient"))
):
    patient = db.execute(text("""
        SELECT id FROM patients WHERE user_id = :user_id
    """), {"user_id": user["user_id"]}).fetchone()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    result = db.execute(text("""
        SELECT a.id, a.appointment_date, a.status,
               u.name as doctor_name, d.specialization, d.hospital_name
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        WHERE a.patient_id = :patient_id
        ORDER BY a.appointment_date DESC
    """), {"patient_id": patient.id}).fetchall()

    return [dict(row._mapping) for row in result]


# ─── NEW: Patient cancels own appointment ─────────────────────────────────────
@router.delete("/cancel/{appointment_id}")
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("patient"))
):
    patient = db.execute(text("""
        SELECT id FROM patients WHERE user_id = :user_id
    """), {"user_id": user["user_id"]}).fetchone()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Ensure the appointment belongs to this patient
    appt = db.execute(text("""
        SELECT id, status FROM appointments
        WHERE id = :appt_id AND patient_id = :patient_id
    """), {"appt_id": appointment_id, "patient_id": patient.id}).fetchone()

    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed appointment")

    db.execute(text("""
        UPDATE appointments SET status = 'cancelled' WHERE id = :appt_id
    """), {"appt_id": appointment_id})

    db.commit()
    return {"message": "Appointment cancelled"}