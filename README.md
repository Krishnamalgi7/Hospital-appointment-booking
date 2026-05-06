# 🏥 Hospitum Core — Enterprise Hospital Management SaaS

Hospitum Core is a modern enterprise-grade Hospital Appointment Booking and Management System built using FastAPI, MySQL, HTML, CSS, and JavaScript.

The platform provides a premium SaaS experience for:

* 👤 Patients
* 👨‍⚕️ Doctors
* 🏛️ Hospital Administrators

Designed with a clean healthcare-focused UI inspired by modern enterprise SaaS products like Stripe, Notion, and professional healthcare ERP systems.

---

# ✨ Features

## 👤 Patient Portal

* Browse hospitals in premium card/grid layout
* View doctors hospital-wise
* Book appointments using modern modal workflow
* View medical history securely
* Responsive dashboard experience

---

## 👨‍⚕️ Doctor Dashboard

* Appointment analytics overview
* Manage appointment statuses
* Add medical records
* Professional doctor profile header
* Patient appointment management

---

## 🏛️ Admin Control Center

* Full Hospital CRUD
* Hospital-wise Doctor Management
* Create/Edit/Delete Doctors
* Safe deletion strategy
* Enterprise infrastructure dashboard

---

# 🛠️ Tech Stack

| Layer          | Technology                      |
| -------------- | ------------------------------- |
| Frontend       | HTML5, CSS3, Vanilla JavaScript |
| Backend        | FastAPI (Python)                |
| Database       | MySQL                           |
| Authentication | JWT Token Authentication        |
| API Testing    | Swagger UI                      |
| Design         | Premium SaaS Design System      |

---

# 🎨 Design Philosophy

Hospitum Core follows a:

# ✅ Clinical + Premium SaaS Design

Inspired by:

* Stripe Dashboard
* Notion
* Modern Healthcare ERP
* Enterprise SaaS Platforms

---

# 📁 Project Structure

```bash
Hospitum-Core/
│
├── backend/
│   ├── app/
│   │   ├── routes/              # API Route Handlers
│   │   │   ├── admin.py
│   │   │   ├── auth.py
│   │   │   ├── doctor.py
│   │   │   └── patient.py
│   │   │
│   │   ├── utils/               # Auth & Security Helpers
│   │   │   ├── dependencies.py
│   │   │   └── security.py
│   │   │
│   │   ├── main.py              # App Entry Point
│   │   └── database.py          # SQLAlchemy Configuration
│   │
│   ├── requirements.txt         # Python Dependencies
│   └── migrate.py               # Database Migration Script
│
├── frontend/
│   ├── assets/                  # Images & Branding
│   ├── css/
│   │   └── styles.css           # Premium SaaS Design System
│   ├── js/                      # Frontend Logic
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── doctor.js
│   │   └── patient.js
│   │
│   ├── index.html               # Unified Login/Register
│   ├── admin.html               # Admin Dashboard
│   ├── doctor.html              # Doctor Dashboard
│   └── patient.html             # Patient Dashboard
│
├── .env                         # Environment Variables
├── .gitignore
└── README.md
```

---

# 🗄️ Database Setup

## 1️⃣ Create Database

Open MySQL Workbench or MySQL CLI and run:

```sql id="azn8sm"
CREATE DATABASE hospital_db;

USE hospital_db;
```

---

# 📋 Create Tables

## USERS TABLE

```sql id="u6h8ko"
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('patient', 'doctor', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## PATIENTS TABLE

```sql id="4r9ht8"
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    age INT NULL,
    gender VARCHAR(10) NULL,
    phone VARCHAR(15) NULL,

    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## HOSPITALS TABLE

```sql id="6jk4vt"
CREATE TABLE hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL
);
```

---

## DOCTORS TABLE

```sql id="0lwhgk"
CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    hospital_id INT NOT NULL,
    phone VARCHAR(15),
    status ENUM('active', 'inactive') DEFAULT 'active',

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);
```

---

## APPOINTMENTS TABLE

```sql id="25xt2k"
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATETIME NOT NULL,
    status ENUM('booked', 'completed', 'cancelled') DEFAULT 'booked',
    notes TEXT NULL,

    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);
```

---

## MEDICAL RECORDS TABLE

```sql id="y8mjlwm"
CREATE TABLE medical_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    diagnosis TEXT NOT NULL,
    medicines TEXT NOT NULL,
    next_visit_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);
```

---

# 🔗 Database Relationships

```text id="3lsb3t"
users
 ├── patients
 └── doctors

hospitals
 └── doctors

appointments
 ├── patients
 └── doctors

medical_records
 ├── patients
 └── doctors
```

---

# 🚀 Backend Setup

## 1️⃣ Navigate to backend

```bash id="r4c9ul"
cd backend
```

---

## 2️⃣ Create Virtual Environment

### Windows

```bash id="8r8j3z"
python -m venv venv
```

Activate:

```bash id="t9r64s"
venv\Scripts\activate
```

---

### Linux / Mac

```bash id="jlwm7n"
python3 -m venv venv
```

Activate:

```bash id="m6gm1w"
source venv/bin/activate
```

---

## 3️⃣ Install Dependencies

```bash id="1w49l4"
pip install -r requirements.txt
```

---

## 4️⃣ Configure Database Connection

Open:

```bash id="jlwmym"
backend/app/database.py
```

Update:

```python id="1sww5g"
DATABASE_URL = "mysql+pymysql://root:your_password@localhost/hospital_db"
```

Replace:

* root
* your_password

with your own MySQL credentials.

---

## 5️⃣ Install Required Package

```bash id="zvjlwm"
pip install cryptography
```

---

## 6️⃣ Run Backend Server

```bash id="jlwm7r"
uvicorn app.main:app --reload
```

Backend runs at:

```text id="jlwm8g"
http://127.0.0.1:8000
```

---

# 📄 Swagger API Docs

Open:

```text id="6bvmui"
http://127.0.0.1:8000/docs
```

Use Swagger to:

* test APIs
* authorize JWT tokens
* debug backend

---

# 🌐 Frontend Setup

## Navigate to frontend

```bash id="jlwm6n"
cd frontend
```

---

## Run Local Server

### Option 1 (Recommended)

```bash id="jlwm5a"
python -m http.server 5500
```

Open:

```text id="jlwm41"
http://localhost:5500
```

---

### Option 2

Use VS Code Live Server extension.

---

# 🔐 Authentication System

The system uses:

# ✅ JWT Authentication

Roles:

* admin
* doctor
* patient

---

# 🔑 JWT Workflow

1. User logs in
2. Backend returns JWT token
3. Token stored in localStorage
4. Protected APIs use:

```text id="jlwm2b"
Authorization: Bearer <token>
```

---

# 👨‍💼 Create Admin Account

For security reasons, no default password is exposed publicly.

Generate your own bcrypt password hash.

---

## Open Python shell

```bash id="jlwm1c"
python
```

---

## Generate password hash

```python id="jlwm0d"
from passlib.hash import bcrypt

print(bcrypt.hash("your_admin_password"))
```

Copy the generated hash.

---

## Insert Admin User

```sql id="jlwm9e"
INSERT INTO users (
    name,
    email,
    password_hash,
    role
)
VALUES (
    'Hospital Admin',
    'admin@hospital.com',
    'PASTE_GENERATED_HASH_HERE',
    'admin'
);
```

---

# 👤 Patient Workflow

1. Register account
2. Browse hospitals
3. Select hospital
4. Select doctor
5. Book appointment
6. View medical history

---

# 👨‍⚕️ Doctor Workflow

1. Admin creates doctor
2. Doctor logs in
3. Views appointments
4. Updates appointment status
5. Adds medical records

---

# 🏛️ Admin Workflow

1. Login as admin
2. Create hospitals
3. Open hospital
4. Manage doctors inside hospital
5. Edit/Delete doctors safely

---

# 🔒 Safe Delete Strategy

The system prevents unsafe deletion.

## Hospitals

Cannot delete hospital if doctors exist.

---

## Doctors

Cannot delete doctor if:

* appointments exist
* medical records exist

This protects historical healthcare data.

---

# 🎨 UI/UX Highlights

* Premium Healthcare SaaS UI
* Responsive Dashboard Layouts
* Sidebar Navigation
* Modern Card Design
* Toast Notifications
* Modal Workflows
* Professional Authentication Screen
* Hospital-first navigation architecture

---

# 📊 Dashboard Features

## Admin

* Total Hospitals
* Total Doctors

---

## Doctor

* Pending Appointments
* Completed Appointments
* Cancelled Appointments

---

## Patient

* Upcoming Appointments
* Medical History
* Hospital Browsing

---

# ⚡ API Endpoints Overview

## Authentication

```text id="jlwm8f"
POST /auth/register
POST /auth/login
```

---

## Patient

```text
GET /patient/profile
GET /patient/hospitals
GET /patient/appointments
POST /patient/book
GET /patient/history
```

---

## Doctor

```text
GET /doctor/profile
GET /doctor/appointments
PUT /doctor/update-status
POST /doctor/add-record
GET /doctor/stats
```

---

## Admin

```text id="jlwm5i"
POST /admin/create-hospital
GET /admin/hospitals
PUT /admin/update-hospital
DELETE /admin/delete-hospital

POST /admin/create-doctor
PUT /admin/update-doctor
DELETE /admin/delete-doctor
```

---

# 🧪 Useful MySQL Queries

## Show tables

```sql id="jlwm4j"
SHOW TABLES;
```

---

## View users

```sql id="jlwm3k"
SELECT * FROM users;
```

---

## View hospitals

```sql id="jlwm2l"
SELECT * FROM hospitals;
```

---

## View doctors

```sql id="jlwm1m"
SELECT * FROM doctors;
```

---

## View appointments

```sql id="jlwm0n"
SELECT * FROM appointments;
```

---

## View medical records

```sql id="jlwm9o"
SELECT * FROM medical_records;
```

---

# 🚀 Deployment Suggestions

| Service  | Recommendation              |
| -------- | --------------------------- |
| Frontend | Vercel / Netlify            |
| Backend  | Railway / Render            |
| Database | Railway MySQL / PlanetScale |

---

# 🛡️ Security Features

* JWT Authentication
* Role-Based Access Control
* Protected APIs
* Secure Password Hashing
* Safe Delete Logic

---

# 📸 Future Enhancements

Potential upgrades:

* Doctor availability scheduling
* Email notifications
* Video consultations
* AI symptom analysis
* Prescription PDF export
* Analytics dashboard
* Payment gateway integration

---

# 👨‍💻 Developer Notes

This project follows:

# ✅ Enterprise-style Architecture

Focus Areas:

* scalable design
* clean separation of concerns
* professional workflow management
* premium SaaS UI/UX

---

# 📄 License

Internal / Private Enterprise Software

---

# ❤️ Built With

* FastAPI
* MySQL
* Vanilla JavaScript
* Modern SaaS Design Principles

---

# ⭐ Final Note

Hospitum Core is designed to simulate a real-world Hospital ERP / Healthcare SaaS workflow while maintaining clean architecture and modern UX suitable for:

* portfolios
* internships
* major projects
* resume showcase
* SaaS experimentation
