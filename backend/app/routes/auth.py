from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.security import hash_password, verify_password, create_access_token
from sqlalchemy import text

router = APIRouter()

# ✅ REGISTER
@router.post("/register")
def register(name: str, email: str, password: str, role: str = "patient", db: Session = Depends(get_db)):

    # prevent doctor/admin self registration
    if role in ["doctor", "admin"]:
        role = "patient"

    # check if user exists
    existing_user = db.execute(text("SELECT * FROM users WHERE email=:email"), {"email": email}).fetchone()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = hash_password(password)

    user_result = db.execute(text("""
        INSERT INTO users (name, email, password_hash, role)
        VALUES (:name, :email, :password, :role)
    """), {
        "name": name,
        "email": email,
        "password": hashed_pw,
        "role": role
    })

    new_user_id = user_result.lastrowid

    # Automatically create linked patient profile
    if role == "patient":
        db.execute(text("""
            INSERT INTO patients (user_id)
            VALUES (:user_id)
        """), {"user_id": new_user_id})

    db.commit()

    return {"message": "User registered successfully"}


# ✅ LOGIN
@router.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):

    user = db.execute(text("SELECT * FROM users WHERE email=:email"), {"email": email}).fetchone()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Prevent inactive doctors from logging in
    if user.role == "doctor":
        doctor = db.execute(text("SELECT status FROM doctors WHERE user_id=:user_id"), {"user_id": user.id}).fetchone()
        if doctor and getattr(doctor, 'status', 'active') == 'inactive':
            raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token({"user_id": user.id, "role": user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name
    }