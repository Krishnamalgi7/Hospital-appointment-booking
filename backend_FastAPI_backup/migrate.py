"""
migrate.py -- Run once to apply DB changes:
  1. Create hospitals table
  2. Add hospital_id FK column to doctors (nullable, safe)
  3. Insert default admin user (admin@hospital.com / admin123)

Usage:
  cd backend
  python migrate.py
"""

import os
import sys
from dotenv import load_dotenv
import pymysql
from passlib.context import CryptContext

# Fix Windows console encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

DB_HOST     = os.getenv('DB_HOST', 'localhost')
DB_USER     = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'password')
DB_NAME     = os.getenv('DB_NAME', 'hospital_db')

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def run():
    conn = pymysql.connect(
        host=DB_HOST, user=DB_USER,
        password=DB_PASSWORD, database=DB_NAME,
        charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor
    )
    cur = conn.cursor()

    # 1. Create hospitals table
    print("[1] Creating hospitals table if not exists...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS hospitals (
            id       INT AUTO_INCREMENT PRIMARY KEY,
            name     VARCHAR(255) NOT NULL,
            location VARCHAR(255)
        )
    """)
    print("    OK - hospitals table ready.")

    # 2. Add hospital_id column to doctors (nullable, safe)
    print("[2] Checking doctors.hospital_id column...")
    cur.execute("""
        SELECT COUNT(*) as cnt
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s
          AND TABLE_NAME   = 'doctors'
          AND COLUMN_NAME  = 'hospital_id'
    """, (DB_NAME,))
    exists = cur.fetchone()['cnt']

    if not exists:
        cur.execute("""
            ALTER TABLE doctors
            ADD COLUMN hospital_id INT NULL,
            ADD CONSTRAINT fk_doctor_hospital
                FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
                ON DELETE SET NULL
        """)
        print("    OK - doctors.hospital_id column added.")
    else:
        print("    SKIP - doctors.hospital_id already exists.")

    # 3. Insert default admin user
    print("[3] Checking for default admin user...")
    ADMIN_EMAIL = "admin@hospital.com"
    ADMIN_PASS  = "admin123"

    cur.execute("SELECT id FROM users WHERE email = %s", (ADMIN_EMAIL,))
    admin = cur.fetchone()

    if not admin:
        hashed = pwd_ctx.hash(ADMIN_PASS)
        cur.execute("""
            INSERT INTO users (name, email, password_hash, role)
            VALUES (%s, %s, %s, 'admin')
        """, ("Hospital Admin", ADMIN_EMAIL, hashed))
        conn.commit()
        print("    OK - Admin user created.")
        print(f"    Email:    {ADMIN_EMAIL}")
        print(f"    Password: {ADMIN_PASS}")
    else:
        print("    SKIP - Admin user already exists.")

    conn.commit()
    cur.close()
    conn.close()
    print("")
    print("Migration complete!")
    print(f"Admin login -> Email: {ADMIN_EMAIL}  Password: {ADMIN_PASS}")

if __name__ == "__main__":
    run()
