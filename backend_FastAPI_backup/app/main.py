from fastapi import FastAPI, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from sqlalchemy import text
from app.routes import auth, doctor, patient, admin
from app.utils.dependencies import require_role
from fastapi.security import HTTPBearer

app = FastAPI(title="Hospital Appointment Booking System")

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


security = HTTPBearer()

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router,    prefix="/auth",    tags=["Auth"])
app.include_router(doctor.router,  prefix="/doctor",  tags=["Doctor"])
app.include_router(patient.router, prefix="/patient", tags=["Patient"])
app.include_router(admin.router,   prefix="/admin",   tags=["Admin"])


@app.get("/")
def home():
    return {"message": "Hospital API running"}


@app.get("/test-db")
def test_db():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        return {"db_status": "connected"}


@app.get("/doctor-only")
def doctor_only(user=Depends(require_role("doctor")), cred=Security(security)):
    return {"message": "Welcome Doctor"}