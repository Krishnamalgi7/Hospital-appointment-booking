/* ═══════════════════════════════════════════════════════════════════════════
   patient.js  — Patient Panel logic (SaaS Redesign)
   ═══════════════════════════════════════════════════════════════════════════ */

const API = 'http://127.0.0.1:8000';

/* ── Auth Guard ──────────────────────────────────────────────────────────── */
const token = localStorage.getItem('token');
const role  = localStorage.getItem('role');
if (!token || role !== 'patient') {
  window.location.href = 'index.html';
}

function authHeaders() {
  return { 'Authorization': `Bearer ${token}` };
}

/* ── Navigation ──────────────────────────────────────────────────────────── */
function switchNav(view, el) {
  if (el) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
  }

  document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');

  const titleMap = {
    'hospitals': 'Hospitals',
    'doctors': 'Doctors',
    'appointments': 'My Appointments',
    'history': 'Medical History',
    'profile': 'My Profile'
  };
  document.getElementById('breadcrumb').innerHTML = `Patient <span>/ ${titleMap[view] || view}</span>`;

  if (view === 'hospitals') loadHospitals();
  if (view === 'appointments') loadAppointments();
  if (view === 'history') loadHistory();
  if (view === 'profile') loadProfile();
}

function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}

/* ── Toast Notifications ─────────────────────────────────────────────────── */
function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  const container = document.getElementById('toast-container');
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ── Date / Time Formatters (module-level) ───────────────────────────────── */
// Strips ISO datetime suffix "T00:00:00" — returns plain YYYY-MM-DD
function fmtDate(val) {
  if (!val) return '';
  return String(val).split('T')[0];
}

// Converts HH:MM:SS strings OR raw MySQL timedelta seconds to 12-hr AM/PM
function fmtTime(val) {
  if (!val && val !== 0) return '';
  let hh, mm;
  const s = String(val);
  if (s.includes(':')) {
    [hh, mm] = s.split(':');
  } else {
    const secs = parseInt(s, 10);
    hh = Math.floor(secs / 3600);
    mm = Math.floor((secs % 3600) / 60);
  }
  hh = parseInt(hh, 10);
  mm = String(mm).padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${mm} ${ampm}`;
}

/* ── Modals ──────────────────────────────────────────────────────────────── */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { 
  document.getElementById(id).classList.remove('open');
  if(id === 'book-modal') document.getElementById('book-form').reset();
}

/* ── HOSPITALS ───────────────────────────────────────────────────────────── */
async function loadHospitals() {
  const container = document.getElementById('hospitals-grid');
  container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Loading hospitals...</div>';
  
  try {
    const res = await fetch(`${API}/patient/hospitals`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const data = await res.json();

    if (data.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">No hospitals available at the moment.</div>';
      return;
    }

    container.innerHTML = data.map(h => `
      <div class="card hospital-card card-hover" style="cursor: pointer;" onclick="viewDoctors(${h.id}, '${escHtml(h.name)}')">
        <div class="hospital-card-header">
          <div>
            <h3>${escHtml(h.name)}</h3>
            <p>📍 ${escHtml(h.location || 'Location not set')}</p>
          </div>
        </div>
        <div class="meta">👨‍⚕️ ${h.doctor_count} Doctor${h.doctor_count !== 1 ? 's' : ''}</div>
        <div class="hospital-card-actions" style="justify-content: flex-end;">
          <span style="color: var(--accent-primary); font-size: 0.9rem; font-weight: 500;">View Doctors &rarr;</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Error loading hospitals.</div>';
  }
}

/* ── DOCTORS ─────────────────────────────────────────────────────────────── */
async function viewDoctors(hospitalId, hospitalName) {
  switchNav('doctors');
  document.getElementById('hospital-doctors-title').textContent = `${hospitalName} — Doctors`;
  const container = document.getElementById('doctors-grid');
  container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Loading doctors...</div>';

  try {
    const res = await fetch(`${API}/doctor/list?hospital_id=${hospitalId}`);
    if (!res.ok) throw new Error();
    const data = await res.json();

    if (data.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">No active doctors currently available at this hospital.</div>';
      return;
    }

    container.innerHTML = data.map(d => `
      <div class="card doctor-card card-hover">
        <div class="doctor-avatar">👨‍⚕️</div>
        <div>
          <h3 style="font-size: 1.1rem;">Dr. ${escHtml(d.name)}</h3>
          <span class="badge badge-booked mt-4" style="margin-bottom: 8px;">${escHtml(d.specialization)}</span>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${escHtml(d.hospital_name)}</p>
        </div>
        <div class="hospital-card-actions mt-4">
          <button class="btn btn-primary btn-full" onclick="openBookModal(${d.id}, '${escHtml(d.name)}', '${escHtml(d.specialization)}')">Book Appointment</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Error loading doctors.</div>';
  }
}

/* ── BOOK APPOINTMENT ────────────────────────────────────────────────────── */
function openBookModal(doctorId, doctorName, doctorSpec) {
  document.getElementById('b-doctor-id').value = doctorId;
  document.getElementById('b-doctor-name').textContent = `Dr. ${doctorName}`;
  document.getElementById('b-doctor-spec').textContent = doctorSpec;
  
  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('b-date');
  dateInput.min = today;
  dateInput.value = '';
  
  document.getElementById('b-slots-container').innerHTML = '<div class="empty-state" style="padding: 10px; font-size: 0.9rem;">Please select a date first</div>';
  document.getElementById('b-time').value = '';
  
  // Add change listener if not already added
  if (!dateInput.dataset.listenerAdded) {
    dateInput.addEventListener('change', fetchAvailableSlots);
    dateInput.dataset.listenerAdded = 'true';
  }
  
  openModal('book-modal');
}

async function fetchAvailableSlots() {
  const doctorId = document.getElementById('b-doctor-id').value;
  const date = document.getElementById('b-date').value;
  const container = document.getElementById('b-slots-container');
  
  if (!date) {
    container.innerHTML = '<div class="empty-state" style="padding: 10px; font-size: 0.9rem;">Please select a date first</div>';
    return;
  }
  
  container.innerHTML = '<div class="empty-state" style="padding: 10px; font-size: 0.9rem;">Loading slots...</div>';
  document.getElementById('b-time').value = '';
  
  try {
    const params = new URLSearchParams({ doctor_id: doctorId, appointment_date: date });
    const res = await fetch(`${API}/patient/available-slots?${params}`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const data = await res.json();
    
    if (data.available_slots.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding: 10px; font-size: 0.9rem; color: var(--danger);">No available slots on this date.</div>';
      return;
    }
    
    container.innerHTML = data.available_slots.map(slot => {
      const [hh, mm] = slot.split(':');
      const h = parseInt(hh, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      const timeLabel = `${h12}:${mm} ${ampm}`;
      return `<button type="button" class="slot-card" onclick="selectSlot(this, '${slot}')">${timeLabel}</button>`;
    }).join('');
    
  } catch (err) {
    container.innerHTML = '<div class="empty-state" style="padding: 10px; font-size: 0.9rem;">Error loading slots.</div>';
  }
}

function selectSlot(btn, timeString) {
  // Deselect all
  document.querySelectorAll('.slot-card').forEach(c => c.classList.remove('selected'));
  // Select clicked
  btn.classList.add('selected');
  document.getElementById('b-time').value = timeString;
}

async function handleBookSubmit(e) {
  e.preventDefault();
  const doctor_id = document.getElementById('b-doctor-id').value;
  const appointment_date = document.getElementById('b-date').value;
  const appointment_time = document.getElementById('b-time').value;
  
  if (!appointment_time) {
    showToast('Please select an available time slot', 'error');
    return;
  }
  
  const btn = document.getElementById('book-btn');
  
  btn.disabled = true;
  btn.textContent = 'Booking...';

  try {
    const params = new URLSearchParams({ doctor_id, appointment_date, appointment_time });
    const res = await fetch(`${API}/patient/book?${params}`, {
      method: 'POST',
      headers: authHeaders()
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to book');
    
    showToast('Appointment booked successfully!', 'success');
    closeModal('book-modal');
    switchNav('appointments', document.querySelectorAll('.nav-item')[1]);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm Booking';
  }
}

/* ── APPOINTMENTS ────────────────────────────────────────────────────────── */
async function loadAppointments() {
  const tbody = document.getElementById('appointments-table-body');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
  
  try {
    const res = await fetch(`${API}/patient/appointments`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const data = await res.json();

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center empty-state">No appointments found.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(a => `
      <tr>
        <td style="font-weight: 500;">
          ${fmtDate(a.appointment_date)}<br>
          <span style="font-size: 0.85rem; color: var(--accent-primary); font-weight: 600;">${fmtTime(a.appointment_time)}</span>
        </td>
        <td>Dr. ${escHtml(a.doctor_name)}</td>
        <td style="color: var(--text-secondary);">${escHtml(a.specialization)}</td>
        <td style="color: var(--text-secondary);">${escHtml(a.hospital_name)}</td>
        <td>
          <span class="badge badge-${a.status}">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span>
        </td>
        <td style="text-align: right;">
          ${a.status !== 'completed' && a.status !== 'cancelled' 
            ? `<button class="btn btn-danger btn-sm" onclick="cancelAppointment(${a.id})">Cancel</button>` 
            : '<span style="color: var(--text-muted); font-size: 0.85rem;">—</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center empty-state">Error loading appointments.</td></tr>';
  }
}

async function cancelAppointment(id) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  try {
    const res = await fetch(`${API}/patient/cancel/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to cancel');
    showToast('Appointment cancelled', 'info');
    loadAppointments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ── MEDICAL HISTORY ─────────────────────────────────────────────────────── */
async function loadHistory() {
  const container = document.getElementById('history-list');
  container.innerHTML = '<div class="empty-state">Loading records...</div>';
  
  try {
    const res = await fetch(`${API}/patient/history`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const data = await res.json();

    if (data.length === 0) {
      container.innerHTML = '<div class="empty-state">No medical records found.</div>';
      return;
    }

    container.innerHTML = data.map(r => {
      let apptInfo = '';
      if (r.appointment_date) {
        let timeStr = '';
        if (r.appointment_time || r.appointment_time === 0) {
          const s = String(r.appointment_time);
          let hh, mm;
          if (s.includes(':')) { [hh, mm] = s.split(':'); }
          else { const secs = parseInt(s, 10); hh = Math.floor(secs / 3600); mm = Math.floor((secs % 3600) / 60); }
          hh = parseInt(hh, 10); mm = String(mm).padStart(2, '0');
          const ampm = hh >= 12 ? 'PM' : 'AM';
          timeStr = ` &bull; ${hh % 12 || 12}:${mm} ${ampm}`;
        }
        apptInfo = `<span style="font-size: 0.8rem; color: var(--text-secondary);">Visited: ${fmtDate(r.appointment_date)}${timeStr}</span>`;
      }
      return `
      <div class="card" style="margin-bottom: 16px;">
        <div class="flex-between mb-4" style="border-bottom: 1px solid var(--border); padding-bottom: 12px;">
          <div>
            <h3 style="font-size: 1.1rem; color: var(--accent-primary);">Dr. ${escHtml(r.doctor_name)}</h3>
            ${apptInfo}
          </div>
          <span class="badge badge-active">${r.next_visit_date ? 'Next Visit: ' + escHtml(r.next_visit_date) : 'No Follow-up'}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Diagnosis</div>
            <div style="font-size: 0.95rem;">${escHtml(r.diagnosis)}</div>
          </div>
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Medicines</div>
            <div style="font-size: 0.95rem;">${escHtml(r.medicines)}</div>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Error loading history.</div>';
  }
}

/* ── PROFILE ─────────────────────────────────────────────────────────────── */
async function loadProfile() {
  const container = document.getElementById('profile-card-container');
  container.innerHTML = '<div class="empty-state">Loading profile...</div>';
  try {
    const res = await fetch(`${API}/patient/profile`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const p = await res.json();
    const genderIcon = p.gender === 'male' ? '♂️' : p.gender === 'female' ? '♀️' : '⚧️';
    const genderLabel = p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '—';
    container.innerHTML = `
      <div class="card" style="max-width: 640px;">
        <div style="display:flex;align-items:center;gap:20px;padding-bottom:24px;border-bottom:1px solid var(--border);margin-bottom:24px;">
          <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent-primary),#3b82f6);color:#fff;
                      display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-weight:700;flex-shrink:0;">
            ${escHtml(p.name.charAt(0).toUpperCase())}
          </div>
          <div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--text-primary);">${escHtml(p.name)}</div>
            <div style="font-size:0.875rem;color:var(--text-secondary);margin-top:2px;">${escHtml(p.email)}</div>
            <div style="margin-top:8px;"><span class="badge badge-active">Patient</span></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div>
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);font-weight:600;margin-bottom:6px;">Age</div>
            <div style="font-size:1rem;font-weight:600;color:var(--text-primary);">${p.age ? p.age + ' years' : '—'}</div>
          </div>
          <div>
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);font-weight:600;margin-bottom:6px;">Gender</div>
            <div style="font-size:1rem;font-weight:600;color:var(--text-primary);">${genderIcon} ${genderLabel}</div>
          </div>
          <div>
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);font-weight:600;margin-bottom:6px;">Phone</div>
            <div style="font-size:1rem;font-weight:600;color:var(--text-primary);">${p.phone ? escHtml(p.phone) : '—'}</div>
          </div>
          <div>
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);font-weight:600;margin-bottom:6px;">Email</div>
            <div style="font-size:1rem;font-weight:600;color:var(--text-primary);">${escHtml(p.email)}</div>
          </div>
        </div>
      </div>`;
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Error loading profile.</div>';
  }
}

/* ── Init ────────────────────────────────────────────────────────────────── */
// Global patient demographics (for PDF reports etc.)
let _patientProfile = {};

(async function init() {
  try {
    const res = await fetch(`${API}/patient/profile`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      _patientProfile = data;
      document.getElementById('header-name').textContent = data.name;
      localStorage.setItem('name', data.name);
      const avatar = document.getElementById('avatar-circle');
      if (avatar && data.name) avatar.textContent = data.name.charAt(0).toUpperCase();
    }
  } catch (err) {
    console.error('Failed to load patient profile', err);
  }
  await loadHospitals();
})();
