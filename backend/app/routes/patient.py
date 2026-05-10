from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.utils.dependencies import require_role
from sqlalchemy import text
from datetime import datetime, timedelta, date

router = APIRouter()

# ─── GET /patient/profile ─────────────────────────────────────────────────────
@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db),
    user=Depends(require_role("patient"))
):
    query = """
        SELECT u.name, p.age, p.gender, p.phone
        FROM patients p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = :user_id
    """
    result = db.execute(text(query), {"user_id": user["user_id"]}).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return dict(result._mapping)


# ─── NEW: Public list of hospitals (for patient booking flow) ────────────────
@router.get("/hospitals")
def list_hospitals(db: Session = Depends(get_db), user=Depends(require_role("patient"))):
    result = db.execute(text("""
        SELECT h.id, h.name, h.location,
               COUNT(d.id) AS doctor_count
        FROM hospitals h
        LEFT JOIN doctors d ON d.hospital_id = h.id AND d.status = 'active'
        GROUP BY h.id, h.name, h.location
        ORDER BY h.name
    """)).fetchall()
    return [dict(row._mapping) for row in result]


# ─── NEW: Available Slots ─────────────────────────────────────────────────────
@router.get("/available-slots")
def get_available_slots(
    doctor_id: int,
    appointment_date: str,
    db: Session = Depends(get_db),
    user=Depends(require_role("patient"))
):
    # 1. Find doctor's hospital
    doctor = db.execute(text("SELECT hospital_id FROM doctors WHERE id = :did"), {"did": doctor_id}).fetchone()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    # 2. Get schedule
    schedule = db.execute(text("SELECT * FROM hospital_schedules WHERE hospital_id = :hid"), {"hid": doctor.hospital_id}).fetchone()
    
    # Defaults if no schedule
    if schedule:
        st = schedule.start_time
        et = schedule.end_time
        interval = schedule.slot_interval
        bs = schedule.break_start
        be = schedule.break_end
    else:
        st = datetime.strptime("09:00", "%H:%M").time()
        et = datetime.strptime("17:00", "%H:%M").time()
        interval = 30
        bs = None
        be = None

    # MySQL TIME columns come back as timedelta — convert to datetime.time
    def to_time(val):
        if val is None:
            return None
        if isinstance(val, timedelta):
            total_seconds = int(val.total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            from datetime import time as dt_time
            return dt_time(hours, minutes, seconds)
        return val  # already a datetime.time

    st = to_time(st)
    et = to_time(et)
    bs = to_time(bs)
    be = to_time(be)

    # 3. Generate all slots
    slots = []
    # Use a dummy date to do datetime math
    current_dt = datetime.combine(date.today(), st)
    end_dt = datetime.combine(date.today(), et)
    
    break_st_dt = datetime.combine(date.today(), bs) if bs else None
    break_et_dt = datetime.combine(date.today(), be) if be else None

    while current_dt + timedelta(minutes=interval) <= end_dt:
        slot_end_dt = current_dt + timedelta(minutes=interval)
        
        # Check if slot falls in break
        is_break = False
        if break_st_dt and break_et_dt:
            # If the slot starts inside the break OR ends inside the break
            if (current_dt >= break_st_dt and current_dt < break_et_dt) or \
               (slot_end_dt > break_st_dt and slot_end_dt <= break_et_dt) or \
               (current_dt <= break_st_dt and slot_end_dt >= break_et_dt):
                is_break = True
                
        if not is_break:
            slots.append(current_dt.time().strftime("%H:%M:%S"))
            
        current_dt += timedelta(minutes=interval)
        
    # 4. Remove booked slots
    booked = db.execute(text("""
        SELECT appointment_time FROM appointments 
        WHERE doctor_id = :did AND appointment_date = :dt AND status != 'cancelled'
    """), {"did": doctor_id, "dt": appointment_date}).fetchall()
    
    booked_times = [str(b.appointment_time) for b in booked]
    # Some DBs return timedelta for TIME columns, handle string conversion safely
    # If timedelta, we convert it to HH:MM:SS
    cleaned_booked = []
    for bt in booked:
        if isinstance(bt.appointment_time, timedelta):
            # Convert timedelta to HH:MM:SS
            total_seconds = int(bt.appointment_time.total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            cleaned_booked.append(f"{hours:02d}:{minutes:02d}:{seconds:02d}")
        else:
            cleaned_booked.append(str(bt.appointment_time))

    available = [s for s in slots if s not in cleaned_booked]
    return {"available_slots": available}

# ─── EXISTING: Book appointment ───────────────────────────────────────────────
@router.post("/book")
def book_appointment(
    doctor_id: int,
    appointment_date: str,
    appointment_time: str,
    db: Session = Depends(get_db),
    user=Depends(require_role("patient"))
):

    patient = db.execute(text("""
        SELECT id FROM patients WHERE user_id = :user_id
    """), {"user_id": user["user_id"]}).fetchone()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    try:
        db.execute(text("""
            INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status)
            VALUES (:patient_id, :doctor_id, :appointment_date, :appointment_time, 'booked')
        """), {
            "patient_id": patient.id,
            "doctor_id": doctor_id,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time
        })
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Selected slot is already booked. Please choose another available slot.")

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
               u.name as doctor_name,
               a.appointment_date, a.appointment_time
        FROM medical_records m
        JOIN doctors d ON m.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        LEFT JOIN appointments a ON a.patient_id = m.patient_id 
            AND a.doctor_id = m.doctor_id
            AND a.status = 'completed'
        WHERE m.patient_id = :patient_id
        GROUP BY m.id, m.diagnosis, m.medicines, m.next_visit_date,
                 u.name, a.appointment_date, a.appointment_time
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
        SELECT a.id, a.appointment_date, a.appointment_time, a.status,
               u.name as doctor_name, d.specialization, d.hospital_name
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        WHERE a.patient_id = :patient_id
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
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