from fastapi import FastAPI
from app.database import engine
from sqlalchemy import text
from app.routes import auth

app = FastAPI()

@app.get("/")
def home():
    return {"message": "API running"}

@app.get("/test-db")
def test_db():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        return {"db_status": "connected"}

app.include_router(auth.router, prefix="/auth", tags=["Auth"])