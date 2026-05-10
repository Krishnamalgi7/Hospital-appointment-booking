/* ═══════════════════════════════════════════════════════════════════════════
   admin.js  — Admin Panel logic (SaaS Redesign)
   ═══════════════════════════════════════════════════════════════════════════ */

const API = 'http://127.0.0.1:8000';

/* ── Auth Guard ──────────────────────────────────────────────────────────── */
const token = localStorage.getItem('token');
const role  = localStorage.getItem('role');
if (!token || role !== 'admin') {
  window.location.href = 'index.html';
}

function authHeaders() {
  return { 'Authorization': `Bearer ${token}` };
}

/* ── Navigation ──────────────────────────────────────────────────────────── */
function switchNav(view, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if(el) el.classList.add('active');

  document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');

  const titleMap = {
    'dashboard': 'Dashboard',
    'hospitals': 'Hospitals Management',
    'doctors': 'Hospital Details'
  };
  document.getElementById('breadcrumb').innerHTML = `Admin <span>/ ${titleMap[view]}</span>`;

  if (view === 'dashboard') loadStats();
  if (view === 'hospitals') loadHospitals();
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

/* ── HOSPITAL SCHEDULE ───────────────────────────────────────────────────── */
async function openScheduleModal(id) {
  document.getElementById('s-hospital-id').value = id;
  
  try {
    const res = await fetch(`${API}/admin/hospital-schedule/${id}`, { headers: authHeaders() });
    const data = await res.json();
    
    if (data.start_time) {
      document.getElementById('s-start-time').value = data.start_time.substring(0, 5);
      document.getElementById('s-end-time').value = data.end_time.substring(0, 5);
      document.getElementById('s-interval').value = data.slot_interval;
      document.getElementById('s-break-start').value = data.break_start ? data.break_start.substring(0, 5) : '';
      document.getElementById('s-break-end').value = data.break_end ? data.break_end.substring(0, 5) : '';
    } else {
      document.getElementById('s-start-time').value = '09:00';
      document.getElementById('s-end-time').value = '17:00';
      document.getElementById('s-interval').value = 30;
      document.getElementById('s-break-start').value = '';
      document.getElementById('s-break-end').value = '';
    }
  } catch (err) {
    console.error('Failed to load schedule', err);
  }
  
  openModal('schedule-modal');
}

async function handleScheduleSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('s-hospital-id').value;
  const start_time = document.getElementById('s-start-time').value;
  const end_time = document.getElementById('s-end-time').value;
  const slot_interval = parseInt(document.getElementById('s-interval').value, 10);
  const break_start = document.getElementById('s-break-start').value || null;
  const break_end = document.getElementById('s-break-end').value || null;
  
  const payload = { start_time, end_time, slot_interval, break_start, break_end };
  
  try {
    const res = await fetch(`${API}/admin/hospital-schedule/${id}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error('Failed to save schedule');
    
    showToast('Schedule updated successfully', 'success');
    closeModal('schedule-modal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ── Modals ──────────────────────────────────────────────────────────────── */
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if(id === 'hospital-modal') document.getElementById('hospital-form').reset();
  if(id === 'doctor-modal') document.getElementById('doctor-form').reset();
}

/* ── DASHBOARD: Load Stats ───────────────────────────────────────────────── */
async function loadStats() {
  try {
    const res = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('stat-hospitals').textContent = data.total_hospitals ?? 0;
    document.getElementById('stat-doctors').textContent = data.total_doctors ?? 0;
    document.getElementById('stat-patients').textContent = data.total_patients ?? 0;
    document.getElementById('stat-appointments').textContent = data.total_appointments ?? 0;
  } catch (err) {
    console.error(err);
  }
}

/* ── HOSPITALS: Load & CRUD ──────────────────────────────────────────────── */
let currentHospitals = [];

async function loadHospitals() {
  const container = document.getElementById('hospitals-grid');
  container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Loading...</div>';
  
  try {
    const res = await fetch(`${API}/admin/hospitals`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    currentHospitals = await res.json();

    if (currentHospitals.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">No hospitals found. Add one to get started.</div>';
      return;
    }

    container.innerHTML = currentHospitals.map(h => `
      <div class="card hospital-card card-hover">
        <div class="hospital-card-header">
          <div>
            <h3>${escHtml(h.name)}</h3>
            <p>📍 ${escHtml(h.location || 'Location not set')}</p>
          </div>
        </div>
        <div class="meta">👨‍⚕️ ${h.doctor_count} Doctor${h.doctor_count !== 1 ? 's' : ''}</div>
        <div class="hospital-card-actions" style="flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" style="flex:1" onclick="editHospital(${h.id})">Edit</button>
          <button class="btn btn-secondary btn-sm" style="flex:1" onclick="viewHospitalDoctors(${h.id})">Doctors</button>
          <button class="btn btn-secondary btn-sm" style="flex:1; background: var(--bg-card-hover);" onclick="openScheduleModal(${h.id})">🗓 Schedule</button>
          <button class="btn btn-danger btn-sm" onclick="deleteHospital(${h.id})">🗑</button>
        </div>
      </div>
    `).join('');
    
    populateHospitalSelects();
  } catch (err) {
    container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Error loading hospitals.</div>';
  }
}

function populateHospitalSelects() {
  const sel = document.getElementById('d-hospital');
  if(!sel) return;
  sel.innerHTML = '<option value="">— Select Hospital —</option>' + 
    currentHospitals.map(h => `<option value="${h.id}">${escHtml(h.name)}</option>`).join('');
}

function editHospital(id) {
  const h = currentHospitals.find(x => x.id === id);
  if (!h) return;
  document.getElementById('h-id').value = h.id;
  document.getElementById('h-name').value = h.name;
  document.getElementById('h-location').value = h.location || '';
  document.getElementById('h-modal-title').textContent = 'Edit Hospital';
  openModal('hospital-modal');
}

async function handleHospitalSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('h-id').value;
  const name = document.getElementById('h-name').value;
  const location = document.getElementById('h-location').value;

  try {
    const params = new URLSearchParams({ name, location });
    let url = `${API}/admin/create-hospital?${params}`;
    let method = 'POST';

    if (id) {
      url = `${API}/admin/update-hospital/${id}?${params}`;
      method = 'PUT';
    }

    const res = await fetch(url, { method, headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error saving hospital');

    showToast(id ? 'Hospital updated' : 'Hospital created', 'success');
    closeModal('hospital-modal');
    loadHospitals();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteHospital(id) {
  if (!confirm('Are you sure you want to delete this hospital?')) return;
  try {
    const res = await fetch(`${API}/admin/delete-hospital/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to delete');
    showToast('Hospital deleted', 'success');
    loadHospitals();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ── DOCTORS: Load & CRUD ────────────────────────────────────────────────── */
let currentDoctors = [];

function viewHospitalDoctors(hospitalId) {
  switchNav('doctors');
  
  const hospital = currentHospitals.find(h => h.id === hospitalId);
  if (hospital) {
    document.getElementById('hospital-detail-title').textContent = `${escHtml(hospital.name)} — Doctors`;
  }
  
  document.getElementById('d-hospital').value = hospitalId;
  const filtered = currentDoctors.filter(d => d.hospital_id === hospitalId);
  renderDoctorsTable(filtered);
}

async function loadDoctors() {
  const tbody = document.getElementById('doctors-table-body');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
  
  try {
    const res = await fetch(`${API}/admin/doctors`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    currentDoctors = await res.json();
    
    if (!document.getElementById('view-doctors').classList.contains('hidden')) {
      const hospitalId = parseInt(document.getElementById('d-hospital').value);
      if (hospitalId) {
        renderDoctorsTable(currentDoctors.filter(d => d.hospital_id === hospitalId));
        return;
      }
    }
    renderDoctorsTable(currentDoctors);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading doctors.</td></tr>';
  }
}

function renderDoctorsTable(doctors) {
  const tbody = document.getElementById('doctors-table-body');
  if (doctors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No doctors found.</td></tr>';
    return;
  }

  tbody.innerHTML = doctors.map(d => `
    <tr>
      <td>
        <div style="font-weight: 500; color: var(--text-primary);">Dr. ${escHtml(d.name)}</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">${escHtml(d.email)}</div>
      </td>
      <td><span class="badge badge-booked">${escHtml(d.specialization)}</span></td>
      <td>${escHtml(d.hospital_linked || d.hospital_name)}</td>
      <td>${escHtml(d.phone || '—')}</td>
      <td>
        <span class="badge ${d.status === 'active' ? 'badge-active' : 'badge-inactive'}">
          ${d.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="editDoctor(${d.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteDoctor(${d.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openDoctorModal() {
  document.getElementById('d-id').value = '';
  document.getElementById('d-modal-title').textContent = 'Add Doctor';
  document.getElementById('d-email').disabled = false;
  document.getElementById('d-status-group').style.display = 'none';
  openModal('doctor-modal');
}

function editDoctor(id) {
  const d = currentDoctors.find(x => x.id === id);
  if (!d) return;
  document.getElementById('d-id').value = d.id;
  document.getElementById('d-name').value = d.name;
  document.getElementById('d-email').value = d.email;
  document.getElementById('d-specialization').value = d.specialization;
  document.getElementById('d-phone').value = d.phone || '';
  document.getElementById('d-hospital').value = d.hospital_id;
  
  // Disable email change for editing
  document.getElementById('d-email').disabled = true;
  
  // Show status toggle
  document.getElementById('d-status-group').style.display = 'block';
  document.getElementById('d-status').value = d.status || 'active';

  document.getElementById('d-modal-title').textContent = 'Edit Doctor';
  openModal('doctor-modal');
}

async function handleDoctorSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('d-id').value;
  const name = document.getElementById('d-name').value;
  const specialization = document.getElementById('d-specialization').value;
  const hospital_id = document.getElementById('d-hospital').value;
  const phone = document.getElementById('d-phone').value;

  try {
    if (id) {
      // Edit
      const status = document.getElementById('d-status').value;
      const params = new URLSearchParams({ name, specialization, hospital_id, phone, status });
      const res = await fetch(`${API}/admin/update-doctor/${id}?${params}`, { method: 'PUT', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error updating doctor');
      showToast('Doctor updated', 'success');
    } else {
      // Create
      const email = document.getElementById('d-email').value;
      const params = new URLSearchParams({ name, email, specialization, hospital_id, phone });
      const res = await fetch(`${API}/admin/create-doctor?${params}`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error creating doctor');
      
      if (data.email_sent) {
        showToast('✅ Doctor created successfully. 📧 Credential email sent.', 'success');
      } else {
        showToast('⚠️ Doctor created successfully, but email delivery failed. Please verify SMTP configuration.', 'error');
      }
    }
    closeModal('doctor-modal');
    loadDoctors();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteDoctor(id) {
  if (!confirm('Are you sure you want to delete this doctor? \n(Note: If they have appointments, this will fail. Use Edit to set them to Inactive instead.)')) return;
  try {
    const res = await fetch(`${API}/admin/delete-doctor/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to delete');
    showToast('Doctor deleted', 'success');
    loadDoctors();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ── Init ────────────────────────────────────────────────────────────────── */
(async function init() {
  await loadHospitals();
  await loadDoctors();
  loadStats();
})();
