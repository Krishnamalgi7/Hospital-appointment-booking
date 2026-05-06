/* ═══════════════════════════════════════════════════════════════════════════
   doctor.js  — Doctor Dashboard logic (SaaS Redesign)
   ═══════════════════════════════════════════════════════════════════════════ */

const API = 'http://127.0.0.1:8000';

/* ── Auth Guard ──────────────────────────────────────────────────────────── */
const token = localStorage.getItem('token');
const role  = localStorage.getItem('role');
if (!token || role !== 'doctor') {
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
    'dashboard': 'Overview',
    'appointments': 'Appointments',
    'records': 'Medical Records'
  };
  document.getElementById('breadcrumb').innerHTML = `Doctor <span>/ ${titleMap[view]}</span>`;

  if (view === 'dashboard') loadStats();
  if (view === 'appointments') loadAppointments();
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

/* ── Profile Setup ───────────────────────────────────────────────────────── */
async function loadDoctorProfile() {
  try {
    const res = await fetch(`${API}/doctor/profile`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const data = await res.json();
    
    const displayName = data.name.startsWith('Dr.') ? data.name : `Dr. ${data.name}`;
    document.getElementById('header-name').textContent = displayName;
    document.getElementById('doc-name').textContent = displayName;
    document.getElementById('doc-spec').textContent = data.specialization || 'Specialist';
    document.getElementById('doc-hospital').textContent = data.hospital_name || 'Unassigned Hospital';
  } catch (err) {
    document.getElementById('doc-name').textContent = 'Profile Load Error';
    document.getElementById('doc-spec').textContent = '—';
    document.getElementById('doc-hospital').textContent = '—';
  }
}

/* ── OVERVIEW (Stats) ────────────────────────────────────────────────────── */
async function loadStats() {
  try {
    const res = await fetch(`${API}/doctor/stats`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const data = await res.json();
    
    document.getElementById('stat-total').textContent = data.total_appointments ?? 0;
    document.getElementById('stat-pending').textContent = data.pending ?? 0;
    document.getElementById('stat-completed').textContent = data.completed ?? 0;
    document.getElementById('stat-cancelled').textContent = data.cancelled ?? 0;
  } catch (err) {
    console.error(err);
  }
}

/* ── APPOINTMENTS ────────────────────────────────────────────────────────── */
async function loadAppointments() {
  const tbody = document.getElementById('appointments-table-body');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
  
  try {
    const res = await fetch(`${API}/doctor/appointments`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const data = await res.json();

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center empty-state">No appointments assigned to you yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(a => `
      <tr>
        <td style="font-weight: 500;">${escHtml(a.patient_name)}</td>
        <td style="color: var(--text-secondary);">#${a.patient_id}</td>
        <td>${escHtml(a.appointment_date)}</td>
        <td>
          <span class="badge badge-${a.status}">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span>
        </td>
        <td style="text-align: right;">
          <select 
            onchange="updateStatus(${a.id}, this.value)" 
            style="background: var(--bg-primary); border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; outline: none;"
            ${a.status === 'cancelled' || a.status === 'completed' ? 'disabled' : ''}
          >
            <option value="booked" ${a.status === 'booked' ? 'selected' : ''}>Booked</option>
            <option value="completed" ${a.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${a.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="prepRecord(${a.patient_id})">Add Record</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center empty-state">Error loading appointments.</td></tr>';
  }
}

async function updateStatus(id, newStatus) {
  try {
    // Note: The API uses a PATCH or PUT endpoint
    // We updated to PUT /doctor/update-status in the python backend
    const params = new URLSearchParams({ appointment_id: id, status: newStatus });
    const res = await fetch(`${API}/doctor/update-status?${params}`, {
      method: 'PUT',
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to update');
    showToast('Status updated', 'success');
    loadAppointments();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
    loadAppointments(); // revert select changes
  }
}

/* ── MEDICAL RECORDS ─────────────────────────────────────────────────────── */
function prepRecord(patientId) {
  switchNav('records', document.querySelectorAll('.nav-item')[2]);
  document.getElementById('rec-patient-id').value = patientId;
  document.getElementById('rec-next-visit').value = '';
  document.getElementById('rec-diagnosis').value = '';
  document.getElementById('rec-medicines').value = '';
  showToast(`Patient ID #${patientId} loaded.`, 'info');
}

async function submitRecord(e) {
  e.preventDefault();
  
  const patient_id = document.getElementById('rec-patient-id').value;
  const next_visit_date = document.getElementById('rec-next-visit').value;
  const diagnosis = document.getElementById('rec-diagnosis').value;
  const medicines = document.getElementById('rec-medicines').value;
  const btn = document.getElementById('record-btn');
  
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const params = new URLSearchParams({ patient_id, diagnosis, medicines, next_visit_date });
    const res = await fetch(`${API}/doctor/add-record?${params}`, {
      method: 'POST',
      headers: authHeaders()
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to add record');
    
    showToast('Medical record saved successfully!', 'success');
    document.getElementById('record-form').reset();
    switchNav('appointments', document.querySelectorAll('.nav-item')[1]);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Medical Record';
  }
}

/* ── Init ────────────────────────────────────────────────────────────────── */
(async function init() {
  loadDoctorProfile();
  await loadStats();
  await loadAppointments();
})();
