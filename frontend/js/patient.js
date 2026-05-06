/* ═══════════════════════════════════════════════════════════════════════════
   patient.js  — Patient Dashboard logic
   ═══════════════════════════════════════════════════════════════════════════ */

const API = 'http://127.0.0.1:8000';

/* ── Auth guard ─────────────────────────────────────────────────────────── */
const token = localStorage.getItem('token');
const role  = localStorage.getItem('role');
if (!token || role !== 'patient') {
  window.location.href = 'index.html';
}

/* ── Auth headers helper ─────────────────────────────────────────────────── */
function authHeaders() {
  return { 'Authorization': `Bearer ${token}` };
}

/* ── Toast ───────────────────────────────────────────────────────────────── */
function showToast(msg, type = 'success') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icons[type] ?? 'ℹ️'} ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 320);
  }, 3500);
}

/* ── Alert in panel ──────────────────────────────────────────────────────── */
function showPanelAlert(containerId, msg, type = 'error') {
  const icon = type === 'error' ? '❌' : '✅';
  document.getElementById(containerId).innerHTML =
    `<div class="alert alert-${type}">${icon} ${msg}</div>`;
  setTimeout(() => { document.getElementById(containerId).innerHTML = ''; }, 4000);
}

/* ── Tab switching ───────────────────────────────────────────────────────── */
const TABS = ['book', 'appts', 'history'];
function switchTab(name) {
  TABS.forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active',   t === name);
    document.getElementById(`panel-${t}`).classList.toggle('active', t === name);
  });
  if (name === 'appts')   loadAppointments();
  if (name === 'history') loadHistory();
}

/* ── Decode JWT name ─────────────────────────────────────────────────────── */
function getUserNameFromToken() {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.name ?? null;
  } catch { return null; }
}

/* ── Set header user info ────────────────────────────────────────────────── */
async function initUserInfo() {
  /* Try to get name from a /me endpoint – fall back to token or stored value */
  let name = localStorage.getItem('user_name') ?? getUserNameFromToken() ?? 'Patient';

  /* Try fetching actual name from the history endpoint (doctor name will differ – skip) */
  document.getElementById('header-avatar').textContent  = name.charAt(0).toUpperCase();
  document.getElementById('header-name').textContent    = name;
  document.getElementById('profile-avatar').textContent = name.charAt(0).toUpperCase();
  document.getElementById('profile-name').textContent   = `Welcome back, ${name}!`;
}

/* ── Logout ──────────────────────────────────────────────────────────────── */
function logout() {
  localStorage.clear();
  showToast('Logged out. See you soon!', 'info');
  setTimeout(() => window.location.href = 'index.html', 600);
}

/* ── LOAD DOCTORS (for dropdown) ─────────────────────────────────────────── */
async function loadDoctors() {
  const sel = document.getElementById('doctor-select');
  try {
    const res  = await fetch(`${API}/doctor/list`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      sel.innerHTML = '<option value="">No doctors available</option>';
      return;
    }
    sel.innerHTML = '<option value="">— Choose a doctor —</option>' +
      data.map(doctor =>
        `<option value="${doctor.id}">${doctor.name} — ${doctor.specialization} (${doctor.hospital_name})</option>`
      ).join('');
  } catch {
    sel.innerHTML = '<option value="">Failed to load doctors</option>';
  }
}

/* ── BOOK APPOINTMENT ────────────────────────────────────────────────────── */
async function bookAppointment(e) {
  e.preventDefault();
  const doctorId = document.getElementById('doctor-select').value;
  const date     = document.getElementById('appt-date').value;

  if (!doctorId || !date) {
    showPanelAlert('book-alert', 'Please select a doctor and date.');
    return;
  }

  /* Prevent booking in the past */
  if (new Date(date) < new Date(new Date().toDateString())) {
    showPanelAlert('book-alert', 'Please select a future date.');
    return;
  }

  const btn = document.getElementById('book-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Booking…';

  try {
    const params = new URLSearchParams({ doctor_id: doctorId, appointment_date: date });
    const res = await fetch(`${API}/patient/book?${params}`, {
      method: 'POST',
      headers: authHeaders()
    });
    const data = await res.json();

    if (!res.ok) {
      showPanelAlert('book-alert', data.detail || 'Booking failed.');
    } else {
      showToast('Appointment booked successfully! 🎉', 'success');
      document.getElementById('book-form').reset();
      await loadDoctors(); // refresh select
    }
  } catch {
    showPanelAlert('book-alert', 'Cannot reach server.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '📅 Confirm Booking';
  }
}

/* ── LOAD APPOINTMENTS ───────────────────────────────────────────────────── */
async function loadAppointments() {
  const container = document.getElementById('appts-content');
  container.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';

  try {
    const res  = await fetch(`${API}/patient/appointments`, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div class="alert alert-error">❌ ${data.detail || 'Failed to load.'}</div>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No appointments yet. Book one in the first tab!</p>
      </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Doctor</th>
              <th>Specialization</th>
              <th>Hospital</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((a, i) => `
              <tr id="row-${a.id}">
                <td>${i + 1}</td>
                <td>${escHtml(a.doctor_name)}</td>
                <td>${escHtml(a.specialization)}</td>
                <td>${escHtml(a.hospital_name)}</td>
                <td>${formatDate(a.appointment_date)}</td>
                <td>${statusBadge(a.status)}</td>
                <td>
                  ${a.status === 'booked'
                    ? `<button class="btn btn-danger btn-sm" onclick="cancelAppointment(${a.id})">✕ Cancel</button>`
                    : '<span style="color:var(--text-muted);font-size:0.8rem">—</span>'}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch {
    container.innerHTML = `<div class="alert alert-error">❌ Cannot reach server.</div>`;
  }
}

/* ── CANCEL APPOINTMENT ──────────────────────────────────────────────────── */
async function cancelAppointment(id) {
  if (!confirm('Cancel this appointment?')) return;

  try {
    const res  = await fetch(`${API}/patient/cancel/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.detail || 'Could not cancel.', 'error');
    } else {
      showToast('Appointment cancelled.', 'info');
      loadAppointments();
    }
  } catch {
    showToast('Cannot reach server.', 'error');
  }
}

/* ── LOAD MEDICAL HISTORY ────────────────────────────────────────────────── */
async function loadHistory() {
  const container = document.getElementById('history-content');
  container.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';

  try {
    const res  = await fetch(`${API}/patient/history`, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div class="alert alert-error">❌ ${data.detail || 'Failed to load.'}</div>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No medical records yet.</p>
      </div>`;
      return;
    }

    container.innerHTML = data.map(r => `
      <div class="record-card">
        <div class="record-header">
          <span class="record-doctor">👨‍⚕️ Dr. ${escHtml(r.doctor_name)}</span>
          ${r.next_visit_date
            ? `<span style="font-size:0.82rem;color:var(--warning)">
                🗓 Next visit: ${formatDate(r.next_visit_date)}
               </span>`
            : ''}
        </div>
        <div class="record-grid">
          <div class="record-field">
            <div class="record-field-label">Diagnosis</div>
            <div class="record-field-value">${escHtml(r.diagnosis)}</div>
          </div>
          <div class="record-field">
            <div class="record-field-label">Medicines</div>
            <div class="record-field-value">${escHtml(r.medicines)}</div>
          </div>
        </div>
      </div>`).join('');
  } catch {
    container.innerHTML = `<div class="alert alert-error">❌ Cannot reach server.</div>`;
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function statusBadge(status) {
  const map = {
    booked:    '<span class="badge badge-booked">🔵 Booked</span>',
    completed: '<span class="badge badge-completed">✅ Completed</span>',
    cancelled: '<span class="badge badge-cancelled">✕ Cancelled</span>',
  };
  return map[status] ?? `<span class="badge">${status}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ── Min date for appointment picker ─────────────────────────────────────── */
function setMinDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('appt-date').min = today;
}

/* ── Init ────────────────────────────────────────────────────────────────── */
(async function init() {
  setMinDate();
  await initUserInfo();
  await loadDoctors();
})();
