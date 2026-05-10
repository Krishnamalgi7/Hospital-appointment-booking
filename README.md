# Hospitum Core — Enterprise Hospital Management SaaS

Hospitum Core is a production-grade Enterprise Hospital Appointment Booking and Management System built with **FastAPI**, **MySQL**, **HTML5**, **CSS3**, and **Vanilla JavaScript**.

The platform delivers a premium SaaS experience for three roles:

| Role | Description |
|---|---|
| 👤 **Patient** | Browse hospitals, book appointments by time slot, view medical history |
| 👨‍⚕️ **Doctor** | Manage appointments, write prescriptions, generate PDF reports |
| 🏛️ **Admin** | Manage hospitals, doctors, schedule configuration, credential delivery |

> Designed with a Clinical + Premium SaaS aesthetic inspired by Stripe, Linear, and enterprise healthcare ERP platforms.

---

# ✨ Feature Overview

## 👤 Patient Portal

| Feature | Description |
|---|---|
| Patient Registration | Collects Full Name, Email, Age, Gender, Phone, Password at sign-up |
| Hospital Browser | Premium card/grid layout to browse registered hospitals |
| Doctor Listing | View active doctors by hospital with specialty badges |
| Smart Slot Booking | Date picker triggers dynamic slot grid — select a time, click confirm |
| Slot Grid UI | Clickable slot cards with hover, selected, and disabled states |
| Appointment History | View booked appointments with date, time (12-hr), doctor, hospital, and status |
| Medical History | View all past diagnoses, prescriptions, and next visit dates from doctors |
| My Profile | Dedicated profile view showing name, email, age, gender, phone with avatar card |
| Cancel Appointment | Patients can cancel their own booked appointments |
| Real-time Toasts | Success/error notifications for all booking actions |

---

## 👨‍⚕️ Doctor Dashboard

| Feature | Description |
|---|---|
| Appointment Analytics | Overview cards: Total, Pending, Completed, Cancelled |
| Appointment Table | Patient name (with age & gender sub-label), date, time (12-hr), status |
| Smart Status Column | Only "booked" appointments show "Add Record" — cancelled/completed show label |
| Medical Record Form | Write diagnosis and prescription with optional next visit date |
| Auto-Complete | Saving a medical record **automatically marks the appointment as Completed** |
| Download Report | After saving, a **⬇ Download Report** button generates a professional print-ready prescription PDF |
| Prescription PDF | Includes: hospital, doctor, specialization, patient demographics, diagnosis, medicines, next visit, signature block |

---

## 🏛️ Admin Control Center

| Feature | Description |
|---|---|
| Hospital CRUD | Create, edit, and delete hospitals with safe-delete validation |
| Doctor Management | Create, edit, and deactivate doctors hospital-wise |
| Auto-generated Passwords | Secure random passwords auto-generated for new doctors |
| Email Credential Delivery | Credentials (name, email, password, hospital, login URL) sent via Gmail SMTP |
| Fault-tolerant Email | Doctor account is always created; email failure is logged as a warning, not a blocker |
| 🗓 Schedule Settings | Per-hospital schedule configuration modal inside each hospital card |
| Working Hours Config | Set Start Time, End Time, Slot Interval (in minutes), Break Start, Break End |
| Admin Stats | Total hospitals, doctors, patients, and appointments at a glance |

---

# 🗓️ Dynamic Hospital Scheduling Engine

The core scheduling system is a real-world dynamic slot generation engine.

**How it works:**

1. Admin opens a hospital card → clicks **🗓 Schedule**
2. Configures: Start Time, End Time, Slot Interval, Break Start, Break End
3. When patient selects a date, the backend:
   - Reads the hospital's schedule (or uses fallback defaults)
   - Generates all valid time slots
   - Excludes any slot that falls within the break window
   - Removes already-booked slots for that doctor on that date
   - Returns only available slots to the frontend
4. Patient sees a **premium slot card grid** — selects a slot and confirms

**Fallback Defaults (if no schedule configured):**

| Setting | Default |
|---|---|
| Start Time | 09:00 AM |
| End Time | 05:00 PM |
| Slot Interval | 30 minutes |
| Break | None |

**Collision Prevention:**
- Database enforces a `UNIQUE (doctor_id, appointment_date, appointment_time)` constraint
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
| Design | Premium SaaS Design System (CSS variables, Inter font) |
| PDF Reports | Browser `window.print()` with custom HTML/CSS template |

---

# 📁 Project Structure

```
Hospital-appointment-booking/
│
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── admin.py        # Hospital CRUD, Doctor CRUD, Schedule API
│   │   │   ├── auth.py         # Register / Login
│   │   │   ├── doctor.py       # Appointments, Medical Records, Stats
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
│   │   └── styles.css          # Full SaaS design system (tokens, components, slot grid)
│   ├── js/
│   │   ├── admin.js            # Hospital, Doctor, Schedule management logic
│   │   ├── auth.js             # Login / Register logic
│   │   ├── doctor.js           # Appointments, Records, PDF report generator
│   │   └── patient.js          # Slot booking, history, appointment management
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

---

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

---

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

> **Note:** `gender` uses `ENUM('male', 'female', 'other')` — validated at both backend and frontend.

---

### HOSPITALS TABLE

```sql
CREATE TABLE hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL
);
```

---

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

---

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

> **Important:** The `appointment_time` column and `unique_doctor_slot` constraint are critical for the scheduling engine and collision prevention.

---

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

---

### HOSPITAL SCHEDULES TABLE *(New — Scheduling Engine)*

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

# 🔗 Database Relationships

```
users
 ├── patients
 └── doctors

hospitals
 ├── doctors
 └── hospital_schedules   ← NEW

appointments
 ├── patients
 └── doctors

medical_records
 ├── patients
 └── doctors
```

---

# 👨‍💼 Create Admin Account

Use the provided bootstrap script — no manual SQL required.

```bash
# From the backend/ directory with venv activated
python create_admin.py
```

**Interactive prompts:**
```
--- Hospitum Core: Admin Bootstrap ---
Enter admin name: Admin User
Enter admin email: admin@hospital.com
Enter admin password: ••••••••
Confirm admin password: ••••••••
✅ Admin account created successfully.
```

Password input is masked with `*` for security. bcrypt hashing is applied automatically.

---

# 🌍 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=mysql+pymysql://root:your_password@localhost/hospital_db

# Gmail SMTP (for doctor credential emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_gmail@gmail.com
SMTP_PASSWORD=your_app_password
```

> **Gmail:** Use an [App Password](https://myaccount.google.com/apppasswords), not your real password. Enable 2-Step Verification first.

---

# 🚀 Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate (Windows)
venv\Scripts\activate

# 4. Activate (Linux/Mac)
source venv/bin/activate

# 5. Install dependencies
pip install -r requirements.txt

# 6. Create admin
python create_admin.py

# 7. Run server
uvicorn app.main:app --reload
```

Backend runs at: `http://127.0.0.1:8000`  
Swagger UI: `http://127.0.0.1:8000/docs`

---

# 🌐 Frontend Setup

```bash
cd frontend
python -m http.server 5500
```

Open: `http://localhost:5500`

Or use **VS Code Live Server** extension.

---

# 🔐 Authentication System

| Feature | Detail |
|---|---|
| Type | JWT Bearer Token |
| Roles | `admin`, `doctor`, `patient` |
| Storage | `localStorage` |
| Protection | All APIs require `Authorization: Bearer <token>` |
| Role Guard | FastAPI `Depends(require_role(...))` on every protected route |

---

# ⚡ API Endpoints Reference

## Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register patient — params: `name`, `email`, `password`, `age`, `gender`, `phone` |
| POST | `/auth/login` | Login and receive JWT |

---

## Patient APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/patient/profile` | Get patient profile — returns name, email, age, gender, phone |
| GET | `/patient/hospitals` | List all hospitals |
| GET | `/patient/available-slots` | Get available slots for doctor + date |
| POST | `/patient/book` | Book an appointment with date + time |
| GET | `/patient/appointments` | List patient's appointments |
| GET | `/patient/history` | View medical history with appointment date/time |
| DELETE | `/patient/cancel/{id}` | Cancel an appointment |

---

## Doctor APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/doctor/profile` | Get doctor profile |
| GET | `/doctor/appointments` | List all appointments with patient info (name, age, gender) |
| PUT | `/doctor/update-status` | Update appointment status |
| POST | `/doctor/add-record` | Save medical record + auto-complete appointment — params: `patient_id`, `diagnosis`, `medicines`, `appointment_id`, `next_visit_date` (optional) |
| GET | `/doctor/stats` | Get appointment statistics |
| GET | `/doctor/list` | Public list of doctors (for patient booking) |

---

## Admin APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/admin/create-hospital` | Create hospital |
| GET | `/admin/hospitals` | List hospitals with doctor counts |
| PUT | `/admin/update-hospital/{id}` | Update hospital details |
| DELETE | `/admin/delete-hospital/{id}` | Delete hospital (safe) |
| GET | `/admin/hospital-schedule/{id}` | Get hospital schedule config |
| PUT | `/admin/hospital-schedule/{id}` | Set/update hospital schedule |
| POST | `/admin/create-doctor` | Create doctor (auto-generates password, sends email) |
| GET | `/admin/doctors` | List all doctors |
| PUT | `/admin/update-doctor/{id}` | Update doctor details |
| DELETE | `/admin/delete-doctor/{id}` | Delete doctor (safe) |
| GET | `/admin/stats` | Platform-wide statistics |

---

# 🔒 Safe Delete Strategy

| Entity | Blocked If |
|---|---|
| Hospital | Has active doctors assigned |
| Doctor | Has appointments or medical records |

This protects historical patient and appointment data from accidental deletion.

---

# 📧 Email Credential System

When an admin creates a new doctor:

1. A **secure random password** is auto-generated
2. Password is **bcrypt-hashed** before DB insert
3. A **professional HTML email** is sent to the doctor containing:
   - Doctor name
   - Login email
   - Temporary password
   - Assigned hospital
   - Login URL
4. If email fails → **doctor account is still created** (non-blocking)
5. Admin sees a warning toast if email delivery failed

---

# 🎨 UI/UX Highlights

| Feature | Detail |
|---|---|
| Design System | CSS custom properties (variables) with Inter font |
| Color Palette | Deep Slate `#0F172A` + Cyan `#06B6D4` accent |
| Slot Grid | Responsive CSS grid with hover lift, cyan selected glow |
| Time Format | All times displayed in 12-hr AM/PM format |
| Date Format | ISO dates cleaned to `YYYY-MM-DD` display |
| Toasts | Slide-in notification system (success / error / info / warning) |
| Modals | Smooth overlay modals for all CRUD operations |
| Responsive | Mobile-aware sidebar navigation |

---

# 🧪 Useful MySQL Queries

```sql
-- Check all tables
SHOW TABLES;

-- View appointments with times
SELECT * FROM appointments ORDER BY appointment_date, appointment_time;

-- View hospital schedules
SELECT h.name, hs.* FROM hospital_schedules hs JOIN hospitals h ON h.id = hs.hospital_id;

-- View medical records
SELECT * FROM medical_records;

-- View users by role
SELECT id, name, email, role FROM users ORDER BY role;
```

---

# 🚀 Deployment

| Layer | Recommended Service |
|---|---|
| Frontend | Vercel / Netlify |
| Backend | Railway / Render |
| Database | Railway MySQL / PlanetScale |

---

# 🛡️ Security Features

- JWT Authentication with role-based access control
- bcrypt password hashing (all users and admins)
- SMTP credentials loaded from `.env` only (never hardcoded)
- Raw passwords never stored — only hashed values
- `unique_doctor_slot` DB constraint prevents race-condition double-bookings
- Safe delete logic protects critical healthcare records

---

# 📸 What Was Built vs. What's Left

## ✅ Implemented

- [x] Full Auth system (JWT, RBAC)
- [x] Hospital & Doctor CRUD
- [x] Dynamic Scheduling Engine
- [x] Smart Slot Booking UI
- [x] Collision prevention (DB constraint + backend error)
- [x] Auto-complete appointment on medical record save
- [x] Doctor Credential Email System (Gmail SMTP)
- [x] Admin Bootstrap CLI (`create_admin.py`)
- [x] Prescription PDF report generator
- [x] Medical History with appointment date/time
- [x] 12-hr time formatting across all dashboards
- [x] Clean date display (stripped ISO timestamps)
- [x] **Patient Profile System** — registration collects age, gender, phone
- [x] **My Profile page** in patient dashboard (name, email, age, gender, phone card)
- [x] Patient demographics (age & gender) visible in doctor appointment table
- [x] Dark-theme styled Gender dropdown on registration form

## 🔮 Future Enhancements

- [ ] Patient profile edit (update age, phone, gender after registration)
- [ ] Video consultations
- [ ] AI symptom analysis
- [ ] Payment gateway integration
- [ ] Push notifications
- [ ] Analytics dashboard with charts
- [ ] Multi-branch hospital support

---

# 👨‍💻 Developer Notes

This project follows enterprise-style architecture with:
- Clean separation of concerns (routes / utils / frontend modules)
- Professional workflow management
- Fault-tolerant external service integration (email)
- Real-world scheduling constraints enforced at the database level

---

# 📄 License

Internal / Private Enterprise Software

---

# ❤️ Built With

- **FastAPI** — High-performance Python API framework
- **MySQL** — Relational database with scheduling constraints
- **Vanilla JavaScript** — No framework overhead
- **smtplib** — Gmail SMTP email delivery
- **Passlib / bcrypt** — Secure password hashing
- **Modern SaaS Design Principles** — Premium healthcare UX

---

> ⭐ Hospitum Core is designed to simulate a real-world Hospital ERP / Healthcare SaaS workflow — suitable for portfolios, internships, major projects, and SaaS experimentation.
