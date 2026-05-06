import os
from dotenv import load_dotenv
import pymysql

load_dotenv()

conn = pymysql.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', 'password'),
    database=os.getenv('DB_NAME', 'hospital_db')
)

cur = conn.cursor()

try:
    print("Checking if 'status' column exists in doctors table...")
    cur.execute("SHOW COLUMNS FROM doctors LIKE 'status'")
    result = cur.fetchone()
    if not result:
        print("Adding 'status' column to doctors table...")
        cur.execute("ALTER TABLE doctors ADD COLUMN status VARCHAR(20) DEFAULT 'active'")
        conn.commit()
        print("Column 'status' added successfully.")
    else:
        print("Column 'status' already exists.")
except Exception as e:
    print(f"Error executing migration: {e}")
finally:
    cur.close()
    conn.close()
