# Hospitum Core — Enterprise Hospital Management SaaS

Hospitum Core is a production-grade Enterprise Hospital Appointment Booking and Management System built with **FastAPI**, **MySQL**, **HTML5**, **CSS3**, and **Vanilla JavaScript**.

The platform delivers a premium SaaS experience across three distinct roles with a fully responsive, modern design system featuring a dynamic **Light/Dark Mode architecture**.

| Role | Description |
|---|---|
| 👤 **Patient** | Browse hospitals, book appointments by time slot, view medical history, profile management. |
| 👨‍⚕️ **Doctor** | Manage appointments, write prescriptions, on-demand patient lookup, generate PDF reports. |
| 🏛️ **Admin** | Manage hospitals, doctors, schedule configuration, auto-credential delivery via SMTP. |

> Designed with a Clinical + Premium SaaS aesthetic inspired by modern enterprise healthcare platforms.

---

# ✨ Feature Overview

## 🎨 Design System & Architecture
- **Dual-Theme Engine:** Complete Light and Dark mode support (`data-theme` architecture).
- **Persistent Preferences:** `theme.js` saves user preferences via `localStorage`.
- **Premium UI:** Frosted glass components, dynamic hover effects, floating action buttons, and strict CSS variables mapping.

## 👤 Patient Portal
| Feature | Description |
|---|---|
| Full Demographics | Registration collects Full Name, Email, Age, Gender, Phone, and Password. |
| Hospital Browser | Premium card/grid layout to browse registered hospitals. |
| Doctor Listing | View active doctors by hospital with specialty badges. |
| Smart Slot Booking | Date picker triggers dynamic slot grid — select a time, click confirm. |
| Appointment History | View booked appointments with date, time (12-hr), doctor, hospital, and status. |
| Medical History | View all past diagnoses, prescriptions, and next visit dates (Protected against duplicates via Correlated Subqueries). |
| My Profile | Dedicated profile view showing demographic details and avatar card. |
| Cancel Appointment | Patients can cancel their own booked appointments. |

## 👨‍⚕️ Doctor Dashboard
| Feature | Description |
|---|---|
| Appointment Analytics | Overview cards: Total, Pending, Completed, Cancelled. |
| Appointment Table | Patient name (with age & gender sub-label), date, time (12-hr), status. |
| Smart Status Column | Only "booked" appointments show "Add Record" — cancelled/completed show label. |
| Medical Record Form | Write diagnosis and prescription with optional next visit date. |
| **Triple-Layer Lock** | Advanced duplicate-prevention on records (Frontend UI Lock, Frontend Logic Lock, Backend SQL Lock). |
| **Patient Lookup** | On-demand search via Patient ID to view a patient's complete clinical history. |
| **Premium PDF Reports** | Auto-generates a print-ready clinical PDF prescription featuring hospital branding, Rx stamp watermark, patient demographics, and doctor signatures. |

## 🏛️ Admin Control Center
| Feature | Description |
|---|---|
| Hospital CRUD | Create, edit, and delete hospitals with safe-delete validation. |
| Doctor Management | Create, edit, and deactivate doctors hospital-wise. |
| Auto-generated Passwords | Secure random passwords auto-generated for new doctors. |
| Email Credential Delivery | Credentials (name, email, password, hospital, login URL) sent via Gmail SMTP. |
| 🗓 Schedule Settings | Per-hospital schedule configuration modal inside each hospital card. |
| Working Hours Config | Set Start Time, End Time, Slot Interval (in minutes), Break Start, Break End. |
| Admin Stats | Total hospitals, doctors, patients, and appointments at a glance. |

---

# 🗓️ Dynamic Hospital Scheduling Engine

The core scheduling system is a real-world dynamic slot generation engine.

**How it works:**
1. Admin opens a hospital card → clicks **🗓 Schedule**
2. Configures: Start Time, End Time, Slot Interval, Break Start, Break End
3. When a patient selects a date, the backend:
   - Reads the hospital's schedule (or uses fallback defaults).
   - Generates all valid time slots.
   - Excludes any slot that falls within the break window.
   - Removes already-booked slots for that doctor on that date.
   - Returns only available slots to the frontend.
4. Patient sees a **premium slot card grid** — selects a slot and confirms.

**Collision Prevention:**
- Database enforces a `UNIQUE (doctor_id, appointment_date, appointment_time)` constraint.
- Backend catches `IntegrityError` and returns: *"Selected slot is already booked. Please choose another available slot."*

---

# 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | FastAPI (Python 3.10+) |
| Database | MySQL |
| Authentication | JWT Bearer Token (RBAC) |
| Email | smtplib + Gmail SMTP |
| API Docs | Swagger UI (`/docs`) |
| PDF Reports | Browser `window.print()` with custom HTML/CSS template injection |

---

# 📁 Project Structure

```text
Hospital-appointment-booking/
│
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── admin.py        # Hospital CRUD, Doctor CRUD, Schedule API
│   │   │   ├── auth.py         # Register / Login
│   │   │   ├── doctor.py       # Appointments, Medical Records, Stats, Lookup
│   │   │   └── patient.py      # Hospitals, Doctors, Slots, Booking, History
│   │   │
│   │   ├── utils/
│   │   │   ├── dependencies.py # JWT role guard
│   │   │   ├── security.py     # bcrypt hashing, JWT encoding
│   │   │   ├── email.py        # Gmail SMTP credential emailer
│   │   │   └── password.py     # Secure random password generator
│   │   │
│   │   ├── main.py             # FastAPI app entry point
│   │   └── database.py         # SQLAlchemy engine & session
│   │
│   ├── create_admin.py         # Secure interactive admin bootstrap CLI
│   └── requirements.txt
│
├── frontend/
│   ├── css/
│   │   └── styles.css          # Full SaaS design system (Light/Dark variables, components)
│   ├── js/
│   │   ├── admin.js            # Hospital, Doctor, Schedule management logic
│   │   ├── auth.js             # Login / Register logic
│   │   ├── doctor.js           # Appointments, Records, PDF generator, Lookup
│   │   ├── patient.js          # Slot booking, history, appointment management
│   │   └── theme.js            # Light/Dark mode state management
│   │
│   ├── index.html              # Unified Login / Register page
│   ├── admin.html              # Admin dashboard
│   ├── doctor.html             # Doctor dashboard
│   └── patient.html            # Patient dashboard
│
├── .env                        # SMTP + DB environment variables
├── .gitignore
└── README.md
```

---

# 🗄️ Database Setup

## 1️⃣ Create Database

```sql
CREATE DATABASE hospital_db;
USE hospital_db;
```

## 2️⃣ Create Tables

### USERS TABLE
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('patient', 'doctor', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### PATIENTS TABLE
```sql
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    age INT NULL,
    gender ENUM('male', 'female', 'other') NULL,
    phone VARCHAR(15) NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### HOSPITALS TABLE
```sql
CREATE TABLE hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL
);
```

### DOCTORS TABLE
```sql
CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    hospital_id INT NOT NULL,
    hospital_name VARCHAR(100),
    phone VARCHAR(15),
    status ENUM('active', 'inactive') DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);
```

### APPOINTMENTS TABLE
```sql
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('booked', 'completed', 'cancelled') DEFAULT 'booked',
    CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, appointment_date, appointment_time),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);
```

### MEDICAL RECORDS TABLE
```sql
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

### HOSPITAL SCHEDULES TABLE
```sql
CREATE TABLE hospital_schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_interval INT NOT NULL DEFAULT 30,
    break_start TIME NULL,
    break_end TIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);
```

---

# 👨‍💼 Create Admin Account

Use the provided bootstrap script — no manual SQL required.

```bash
# From the backend/ directory with venv activated
python create_admin.py
```

**Interactive prompts:**
```text
--- Hospitum Core: Admin Bootstrap ---
Enter admin name: Admin User
Enter admin email: [EMAIL_ADDRESS]
Enter admin password: ••••••••
Confirm admin password: ••••••••
✅ Admin account created successfully.
```

Password input is masked with `*` for security. `bcrypt` hashing is applied automatically.

---

# 🌍 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=mysql+pymysql://root:your_password@localhost/hospital_db

# Gmail SMTP (for doctor credential emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=[EMAIL_ADDRESS]
SMTP_PASSWORD=your_app_password
```

> **Gmail:** Use an [App Password](https://myaccount.google.com/apppasswords), not your real password. Enable 2-Step Verification first.

---

# 🚀 Local Setup & Run Instructions

## Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate (Windows)
venv\Scripts\activate
# OR Activate (Linux/Mac)
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create admin
python create_admin.py

# 6. Run server
uvicorn app.main:app --reload
```

Backend runs at: `http://127.0.0.1:8000`  
Swagger UI: `http://127.0.0.1:8000/docs`

## Frontend Setup

```bash
# In a new terminal, navigate to frontend
cd frontend

# Run a simple Python HTTP server
python -m http.server 5500
```

Open your browser to: `http://localhost:5500`
