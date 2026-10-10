import os
from dotenv import load_dotenv
import pymysql

load_dotenv()

conn = pymysql.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', 'password'),
    database=os.getenv('DB_NAME', 'hospital_db'),
    cursorclass=pymysql.cursors.DictCursor
)

cur = conn.cursor()

# Find all users with role 'patient' that do not exist in the patients table
cur.execute("""
    SELECT u.id, u.email 
    FROM users u 
    LEFT JOIN patients p ON u.id = p.user_id 
    WHERE u.role = 'patient' AND p.id IS NULL
""")
missing_patients = cur.fetchall()

if missing_patients:
    print(f"Found {len(missing_patients)} users missing patient records. Fixing...")
    for user in missing_patients:
        cur.execute("INSERT INTO patients (user_id) VALUES (%s)", (user['id'],))
        print(f"  -> Added patient profile for user_id {user['id']} ({user['email']})")
    conn.commit()
    print("Fix complete!")
else:
    print("All patient profiles are intact. No missing records found.")

cur.close()
conn.close()
