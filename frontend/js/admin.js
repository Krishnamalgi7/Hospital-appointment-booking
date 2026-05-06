/* ═══════════════════════════════════════════════════════════════════════════
   admin.js  — Admin Panel logic
   ═══════════════════════════════════════════════════════════════════════════ */

const API = 'http://127.0.0.1:8000';

/* ── Auth guard ─────────────────────────────────────────────────────────── */
const token = localStorage.getItem('token');
const role  = localStorage.getItem('role');
if (!token || role !== 'admin') {
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
  setTimeout(() => { document.getElementById(id).innerHTML = ''; }, 5000);
}

/* ── Tab switching ───────────────────────────────────────────────────────── */
const TABS = ['hospitals', 'doctors'];
function switchTab(name) {
  TABS.forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active',   t === name);
    document.getElementById(`panel-${t}`).classList.toggle('active', t === name);
  });
  if (name === 'doctors') loadDoctorsList();
}

/* ── Logout ──────────────────────────────────────────────────────────────── */
function logout() {
  localStorage.clear();
  showToast('Logged out.', 'info');
  setTimeout(() => window.location.href = 'index.html', 600);
}

/* ── LOAD ADMIN STATS ────────────────────────────────────────────────────── */
async function loadStats() {
  try {
    const res  = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return;

    animateNumber('stat-hospitals',    data.total_hospitals    ?? 0);
    animateNumber('stat-doctors',      data.total_doctors      ?? 0);
    animateNumber('stat-patients',     data.total_patients     ?? 0);
    animateNumber('stat-appointments', data.total_appointments ?? 0);
  } catch { /* silent */ }
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

/* ── LOAD HOSPITALS LIST ─────────────────────────────────────────────────── */
async function loadHospitalsList() {
  const container = document.getElementById('hospitals-list');
  try {
    const res  = await fetch(`${API}/admin/hospitals`, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div class="alert alert-error">❌ ${data.detail || 'Failed to load.'}</div>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🏥</div>
        <p>No hospitals yet. Create one above!</p>
      </div>`;
      return;
    }

    container.innerHTML = `<div class="hospital-grid">
      ${data.map(h => `
        <div class="hospital-card">
          <h4>🏥 ${escHtml(h.name)}</h4>
          <p>📍 ${escHtml(h.location || 'Location not set')}</p>
          <span class="h-badge">👨‍⚕️ ${h.doctor_count} Doctor${h.doctor_count !== 1 ? 's' : ''}</span>
        </div>`).join('')}
    </div>`;

    /* Also populate the doctor-form hospital dropdown */
    populateHospitalDropdown(data);

  } catch {
    container.innerHTML = `<div class="alert alert-error">❌ Cannot reach server.</div>`;
  }
}

/* ── Populate hospital dropdown in doctor form ───────────────────────────── */
function populateHospitalDropdown(hospitals) {
  const sel = document.getElementById('d-hospital');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Select Hospital —</option>' +
    hospitals.map(h => `<option value="${h.id}" ${h.id == current ? 'selected' : ''}>${escHtml(h.name)} — ${escHtml(h.location || '')}</option>`).join('');
}

/* ── CREATE HOSPITAL ─────────────────────────────────────────────────────── */
async function createHospital(e) {
  e.preventDefault();
  const name     = document.getElementById('h-name').value.trim();
  const location = document.getElementById('h-location').value.trim();

  if (!name) {
    showPanelAlert('hospital-form-alert', 'Hospital name is required.');
    return;
  }

  const btn = document.getElementById('create-hospital-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating…';

  try {
    const params = new URLSearchParams({ name, location });
    const res  = await fetch(`${API}/admin/create-hospital?${params}`, {
      method: 'POST',
      headers: authHeaders()
    });
    const data = await res.json();

    if (!res.ok) {
      showPanelAlert('hospital-form-alert', data.detail || 'Failed to create hospital.');
    } else {
      showToast(`Hospital "${name}" created! 🏥`, 'success');
      document.getElementById('hospital-form').reset();
      await loadHospitalsList();   // refresh list + dropdown
      await loadStats();           // refresh stats
    }
  } catch {
    showPanelAlert('hospital-form-alert', 'Cannot reach server.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '➕ Create Hospital';
  }
}

/* ── LOAD DOCTORS LIST ───────────────────────────────────────────────────── */
async function loadDoctorsList() {
  const container = document.getElementById('doctors-list');
  container.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';

  try {
    const res  = await fetch(`${API}/admin/doctors`, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div class="alert alert-error">❌ ${data.detail || 'Failed to load.'}</div>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">👨‍⚕️</div>
        <p>No doctors yet. Create one above!</p>
      </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Specialization</th>
              <th>Hospital</th>
              <th>Location</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((d, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>
                  <div style="font-weight:600;color:#c4b5fd">👨‍⚕️ ${escHtml(d.name)}</div>
                </td>
                <td style="font-size:0.85rem;color:var(--text-secondary)">${escHtml(d.email)}</td>
                <td>
                  <span class="badge badge-booked">${escHtml(d.specialization)}</span>
                </td>
                <td style="font-size:0.85rem">
                  ${d.hospital_linked
                    ? `🏥 ${escHtml(d.hospital_linked)}`
                    : `<span style="color:var(--text-muted)">${escHtml(d.hospital_name || '—')}</span>`}
                </td>
                <td style="font-size:0.83rem;color:var(--text-secondary)">
                  ${escHtml(d.location || '—')}
                </td>
                <td style="font-size:0.85rem">${escHtml(d.phone || '—')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch {
    container.innerHTML = `<div class="alert alert-error">❌ Cannot reach server.</div>`;
  }
}

/* ── CREATE DOCTOR ───────────────────────────────────────────────────────── */
async function createDoctor(e) {
  e.preventDefault();

  const name           = document.getElementById('d-name').value.trim();
  const email          = document.getElementById('d-email').value.trim();
  const password       = document.getElementById('d-password').value;
  const phone          = document.getElementById('d-phone').value.trim();
  const specialization = document.getElementById('d-specialization').value.trim();
  const hospital_id    = document.getElementById('d-hospital').value;

  if (!name || !email || !password || !specialization || !hospital_id) {
    showPanelAlert('doctor-form-alert', 'Please fill in all required fields and select a hospital.');
    return;
  }
  if (password.length < 6) {
    showPanelAlert('doctor-form-alert', 'Password must be at least 6 characters.');
    return;
  }

  const btn = document.getElementById('create-doctor-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating…';

  try {
    const params = new URLSearchParams({ name, email, password, phone, specialization, hospital_id });
    const res  = await fetch(`${API}/admin/create-doctor?${params}`, {
      method: 'POST',
      headers: authHeaders()
    });
    const data = await res.json();

    if (!res.ok) {
      showPanelAlert('doctor-form-alert', data.detail || 'Failed to create doctor.');
    } else {
      showToast(`Dr. ${name} created at ${data.hospital}! 👨‍⚕️`, 'success');
      document.getElementById('doctor-form').reset();
      await loadDoctorsList();
      await loadStats();
    }
  } catch {
    showPanelAlert('doctor-form-alert', 'Cannot reach server.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '➕ Create Doctor Account';
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ── Init ────────────────────────────────────────────────────────────────── */
(async function init() {
  await Promise.all([loadStats(), loadHospitalsList()]);
})();
