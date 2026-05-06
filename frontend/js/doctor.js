/* ═══════════════════════════════════════════════════════════════════════════
   doctor.js  — Doctor Dashboard logic
   ═══════════════════════════════════════════════════════════════════════════ */

const API = 'http://127.0.0.1:8000';

/* ── Auth guard ─────────────────────────────────────────────────────────── */
const token = localStorage.getItem('token');
const role  = localStorage.getItem('role');
if (!token || role !== 'doctor') {
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

/* ── Panel alert ─────────────────────────────────────────────────────────── */
function showPanelAlert(id, msg, type = 'error') {
  const icon = type === 'error' ? '❌' : '✅';
  document.getElementById(id).innerHTML =
    `<div class="alert alert-${type}">${icon} ${msg}</div>`;
  setTimeout(() => { document.getElementById(id).innerHTML = ''; }, 4000);
}

/* ── Tab switching ───────────────────────────────────────────────────────── */
const TABS = ['appointments', 'add-record'];
function switchTab(name) {
  TABS.forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active',   t === name);
    document.getElementById(`panel-${t}`).classList.toggle('active', t === name);
  });
}

/* ── Logout ──────────────────────────────────────────────────────────────── */
function logout() {
  localStorage.clear();
  showToast('Logged out successfully.', 'info');
  setTimeout(() => window.location.href = 'index.html', 600);
}

/* ── LOAD STATS ──────────────────────────────────────────────────────────── */
async function loadStats() {
  try {
    const res  = await fetch(`${API}/doctor/stats`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return;

    /* API now returns: total_appointments, pending, completed, cancelled */
    animateNumber('stat-total',     data.total_appointments ?? 0);
    animateNumber('stat-pending',   data.pending            ?? 0);
    animateNumber('stat-completed', data.completed          ?? 0);
    animateNumber('stat-cancelled', data.cancelled          ?? 0);
  } catch { /* silent — stats are non-critical */ }
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step  = Math.max(1, Math.ceil(target / 20));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

/* ── LOAD APPOINTMENTS ───────────────────────────────────────────────────── */
async function loadAppointments() {
  const container = document.getElementById('appts-content');
  container.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';

  try {
    const res  = await fetch(`${API}/doctor/appointments`, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div class="alert alert-error">❌ ${data.detail || 'Failed to load.'}</div>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No appointments yet.</p>
      </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Patient</th>
              <th>Date</th>
              <th>Status</th>
              <th>Update Status</th>
              <th>Add Record</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((a, i) => `
              <tr id="appt-row-${a.id}">
                <td>${i + 1}</td>
                <td>
                  <div style="font-weight:600">${escHtml(a.patient_name)}</div>
                  <div style="font-size:0.76rem;color:var(--text-muted)">ID: ${a.patient_id}</div>
                </td>
                <td>${formatDate(a.appointment_date)}</td>
                <td>${statusBadge(a.status)}</td>
                <td>
                  ${a.status !== 'cancelled'
                    ? `<div style="display:flex;gap:8px;align-items:center">
                        <select class="status-select" id="sel-${a.id}">
                          <option value="booked"    ${a.status==='booked'    ? 'selected':''}>Booked</option>
                          <option value="completed" ${a.status==='completed' ? 'selected':''}>Completed</option>
                          <option value="cancelled" ${a.status==='cancelled' ? 'selected':''}>Cancelled</option>
                        </select>
                        <button class="btn btn-success btn-sm" onclick="updateStatus(${a.id})">✓ Save</button>
                      </div>`
                    : '<span style="color:var(--text-muted);font-size:0.8rem">Cancelled</span>'}
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm"
                    onclick="openQuickFill(${a.patient_id}, '${escAttr(a.patient_name)}')">
                    📝 Record
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch {
    container.innerHTML = `<div class="alert alert-error">❌ Cannot reach server.</div>`;
  }
}

/* ── UPDATE STATUS — calls PUT /doctor/update-status ─────────────────────── */
async function updateStatus(apptId) {
  const select = document.getElementById(`sel-${apptId}`);
  const status = select.value;

  try {
    const params = new URLSearchParams({ appointment_id: apptId, status });
    const res = await fetch(`${API}/doctor/update-status?${params}`, {
      method: 'PUT',
      headers: authHeaders()
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.detail || 'Failed to update status.', 'error');
    } else {
      showToast(`Status updated to "${status}". ✅`, 'success');
      await loadAppointments();
      await loadStats();          // refresh stat cards immediately
    }
  } catch {
    showToast('Cannot reach server.', 'error');
  }
}

/* ── SUBMIT MEDICAL RECORD ───────────────────────────────────────────────── */
async function submitRecord(e) {
  e.preventDefault();
  const patientId = document.getElementById('rec-patient-id').value;
  const diagnosis = document.getElementById('rec-diagnosis').value.trim();
  const medicines = document.getElementById('rec-medicines').value.trim();
  const nextVisit = document.getElementById('rec-next-visit').value;

  if (!patientId || !diagnosis || !medicines || !nextVisit) {
    showPanelAlert('record-alert', 'Please fill in all fields.');
    return;
  }

  const btn = document.getElementById('record-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving…';

  try {
    const params = new URLSearchParams({
      patient_id:      patientId,
      diagnosis,
      medicines,
      next_visit_date: nextVisit
    });
    const res  = await fetch(`${API}/doctor/add-record?${params}`, {
      method: 'POST',
      headers: authHeaders()
    });
    const data = await res.json();

    if (!res.ok) {
      showPanelAlert('record-alert', data.detail || 'Failed to save record.');
    } else {
      showToast('Medical record saved! 💾', 'success');
      document.getElementById('record-form').reset();
      await loadStats();
    }
  } catch {
    showPanelAlert('record-alert', 'Cannot reach server.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Save Record';
  }
}

/* ── Quick-fill modal ────────────────────────────────────────────────────── */
function openQuickFill(patientId, patientName) {
  document.getElementById('modal-patient-name').textContent       = patientName;
  document.getElementById('modal-patient-id-display').textContent = patientId;
  document.getElementById('rec-patient-id').value = patientId;
  document.getElementById('quickfill-overlay').classList.add('open');
}
function closeModal() {
  document.getElementById('quickfill-overlay').classList.remove('open');
}
function goToRecord() {
  closeModal();
  switchTab('add-record');
}

/* ── Set doctor profile ──────────────────────────────────────────────────── */
function setDoctorProfile() {
  const name = localStorage.getItem('user_name') ?? 'Doctor';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const el1 = document.getElementById('header-avatar');
  const el2 = document.getElementById('header-name');
  const el3 = document.getElementById('doc-name');
  if (el1) el1.textContent = initials;
  if (el2) el2.textContent = name;
  if (el3) el3.textContent = `Dr. ${name}`;
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

function escAttr(str) {
  return (str ?? '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function setMinDate() {
  const today = new Date().toISOString().split('T')[0];
  const el = document.getElementById('rec-next-visit');
  if (el) el.min = today;
}

/* ── Init ────────────────────────────────────────────────────────────────── */
(async function init() {
  setMinDate();
  setDoctorProfile();
  await Promise.all([loadStats(), loadAppointments()]);

  const overlay = document.getElementById('quickfill-overlay');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
  }
})();
