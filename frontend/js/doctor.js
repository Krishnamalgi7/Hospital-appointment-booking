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

    tbody.innerHTML = data.map(a => {
      // fmtDate: strips ISO datetime suffix T00:00:00
      function fmtDate(val) {
        if (!val) return '';
        return String(val).split('T')[0];
      }
      // fmtTime: handles HH:MM:SS strings AND raw second integers from MySQL timedelta
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
        return `${hh % 12 || 12}:${mm} ${ampm}`;
      }
      const ageGender = [
        a.patient_age ? `${a.patient_age}y` : null,
        a.patient_gender ? a.patient_gender.charAt(0).toUpperCase() + a.patient_gender.slice(1) : null
      ].filter(Boolean).join(' · ');

      return `
      <tr>
        <td style="font-weight: 500;">
          ${escHtml(a.patient_name)}
          ${ageGender ? `<br><span style="font-size: 0.78rem; color: var(--text-muted);">${escHtml(ageGender)}</span>` : ''}
        </td>
        <td style="color: var(--text-secondary);">#${a.patient_id}</td>
        <td>
          ${fmtDate(a.appointment_date)}<br>
          <span style="font-size: 0.85rem; color: var(--accent-primary); font-weight: 600;">${fmtTime(a.appointment_time)}</span>
        </td>
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
          ${a.status === 'cancelled' || a.status === 'completed'
            ? `<span style="color: var(--text-muted); font-size: 0.85rem;">${a.status === 'completed' ? 'Completed' : 'Cancelled'}</span>`
            : `<button class="btn btn-secondary btn-sm" onclick="prepRecord(${a.patient_id}, ${a.id})">Add Record</button>`
          }
        </td>
      </tr>`;

    }).join('');
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
// Store last saved record data for PDF generation
let _lastRecord = {};

function prepRecord(patientId, appointmentId) {
  switchNav('records', document.querySelectorAll('.nav-item')[2]);
  document.getElementById('rec-patient-id').value = patientId;
  document.getElementById('rec-appointment-id').value = appointmentId;
  document.getElementById('rec-next-visit').value = '';
  document.getElementById('rec-diagnosis').value = '';
  document.getElementById('rec-medicines').value = '';
  // Hide download button for fresh form
  document.getElementById('download-report-btn').style.display = 'none';
  showToast(`Patient ID #${patientId} loaded.`, 'info');
}

async function submitRecord(e) {
  e.preventDefault();
  
  const patient_id     = document.getElementById('rec-patient-id').value;
  const appointment_id = document.getElementById('rec-appointment-id').value;
  const next_visit_date = document.getElementById('rec-next-visit').value;
  const diagnosis      = document.getElementById('rec-diagnosis').value;
  const medicines      = document.getElementById('rec-medicines').value;
  const btn            = document.getElementById('record-btn');
  
  if (!appointment_id) {
    showToast("Please use the 'Add Record' button from Appointments tab.", 'error');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const params = new URLSearchParams({ patient_id, diagnosis, medicines, appointment_id });
    if (next_visit_date) params.append('next_visit_date', next_visit_date);
    
    const res = await fetch(`${API}/doctor/add-record?${params}`, {
      method: 'POST',
      headers: authHeaders()
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to add record');
    
    showToast('Record saved. Appointment marked as completed!', 'success');
    
    // Store for report
    _lastRecord = { patient_id, diagnosis, medicines, next_visit_date };
    document.getElementById('download-report-btn').style.display = 'inline-flex';
    
    loadAppointments();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Medical Record';
  }
}

/* ── PRESCRIPTION REPORT ─────────────────────────────────────────────────── */
async function downloadReport() {
  let doctorName = 'Doctor', hospitalName = '', specialization = '';
  try {
    const res = await fetch(`${API}/doctor/profile`, { headers: authHeaders() });
    if (res.ok) {
      const d = await res.json();
      doctorName     = d.name || 'Doctor';
      hospitalName   = d.hospital_name || '';
      specialization = d.specialization || '';
    }
  } catch (_) {}

  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const r       = _lastRecord;

  const nextVisitRow = r.next_visit_date
    ? `<tr>
        <td class="lbl">Next Visit</td>
        <td class="val" style="color:#16a34a;font-weight:700;">${escHtml(r.next_visit_date)}</td>
       </tr>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Prescription — Hospitum Core</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; background: #f1f5f9; padding: 30px; color: #1e293b; }
  .rx { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
  .hdr { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 30px 40px; color: #fff; }
  .hdr .brand { font-size: 0.7rem; letter-spacing: 3px; text-transform: uppercase; color: #06b6d4; margin-bottom: 10px; font-weight: 600; }
  .hdr h1 { font-size: 1.5rem; font-weight: 700; }
  .hdr .sub { font-size: 0.875rem; opacity: 0.7; margin-top: 4px; }
  .accent { height: 4px; background: linear-gradient(90deg,#06b6d4,#3b82f6); }
  .body { padding: 32px 40px; }
  .meta { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; border: 1px solid #e2e8f0; }
  .meta .lbl { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }
  .meta .val { font-size: 0.95rem; font-weight: 600; color: #0f172a; margin-top: 3px; }
  table.dtl { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  table.dtl td.lbl { width: 160px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; padding: 8px 0; vertical-align: top; }
  table.dtl td.val { font-size: 0.95rem; font-weight: 500; padding: 8px 0; }
  .sec-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #06b6d4; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; margin: 24px 0 12px; }
  .sec-body { font-size: 0.95rem; line-height: 1.8; white-space: pre-wrap; color: #1e293b; }
  .sig { margin-top: 48px; text-align: right; }
  .sig-block { display: inline-block; text-align: center; border-top: 1.5px solid #1e293b; padding-top: 8px; min-width: 220px; }
  .sig-block .name { font-weight: 700; font-size: 0.95rem; }
  .sig-block .sub { font-size: 0.8rem; color: #64748b; margin-top: 2px; }
  .footer { text-align: center; padding: 18px 40px; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; }
  .rx-badge { display: inline-block; background: #dcfce7; color: #16a34a; border-radius: 20px; padding: 2px 14px; font-size: 0.75rem; font-weight: 700; margin-top: 8px; }
  @media print { body { background:#fff; padding:0; } .rx { box-shadow: none; } }
</style>
</head>
<body>
<div class="rx">
  <div class="hdr">
    <div class="brand">Hospitum Core &mdash; Medical Prescription</div>
    <h1>Dr. ${escHtml(doctorName)}</h1>
    <div class="sub">${escHtml(specialization)}${hospitalName ? ' &bull; ' + escHtml(hospitalName) : ''}</div>
    <div class="rx-badge">Rx</div>
  </div>
  <div class="accent"></div>
  <div class="body">
    <div class="meta">
      <div><div class="lbl">Date</div><div class="val">${dateStr}</div></div>
      <div><div class="lbl">Time</div><div class="val">${timeStr}</div></div>
      <div><div class="lbl">Patient ID</div><div class="val">#${escHtml(String(r.patient_id))}</div></div>
    </div>
    <table class="dtl">
      ${nextVisitRow}
    </table>
    <div class="sec-title">Diagnosis / Complaint</div>
    <div class="sec-body">${escHtml(r.diagnosis)}</div>
    <div class="sec-title">Prescription &amp; Medicines</div>
    <div class="sec-body">${escHtml(r.medicines)}</div>
    <div class="sig">
      <div class="sig-block">
        <div class="name">Dr. ${escHtml(doctorName)}</div>
        <div class="sub">${escHtml(specialization)}</div>
      </div>
    </div>
  </div>
  <div class="footer">
    This is a digitally generated prescription from Hospitum Core. Please retain a copy for your records.
    &bull; Generated on ${dateStr} at ${timeStr}
  </div>
</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=720');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 700);
}

/* ── Init ────────────────────────────────────────────────────────────────── */
(async function init() {
  loadDoctorProfile();
  await loadStats();
  await loadAppointments();
})();
