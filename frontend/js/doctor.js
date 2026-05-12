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
    'dashboard':    'Overview',
    'appointments': 'Appointments',
    'records':      'Medical Records',
    'lookup':       'Patient Lookup'
  };
  document.getElementById('breadcrumb').innerHTML = `Doctor <span>/ ${titleMap[view] || view}</span>`;

  if (view === 'dashboard')    loadStats();
  if (view === 'appointments') loadAppointments();
  // Clear lookup results when navigating away to ensure no data persists
  if (view !== 'lookup') clearLookup();
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
            : `<button class="btn btn-secondary btn-sm" onclick="prepRecord(${a.patient_id}, ${a.id}, '${(a.patient_name||'').replace(/'/g,"\\'")}', ${a.patient_age||'null'}, '${(a.patient_gender||'')}')">Add Record</button>`
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
// Store last saved record data + appointment context for PDF generation
let _lastRecord  = {};
let _apptContext = {};  // holds patient name / age / gender from appointment row

function prepRecord(patientId, appointmentId, patientName, patientAge, patientGender) {
  switchNav('records', document.querySelectorAll('.nav-item')[2]);
  document.getElementById('rec-patient-id').value     = patientId;
  document.getElementById('rec-appointment-id').value = appointmentId;
  document.getElementById('rec-next-visit').value     = '';
  document.getElementById('rec-diagnosis').value      = '';
  document.getElementById('rec-medicines').value      = '';

  // Reset form lock state for new appointment
  const btn = document.getElementById('record-btn');
  btn.disabled           = false;
  btn.textContent        = 'Save Medical Record';
  btn.dataset.saved      = 'false';
  btn.style.background   = '';
  btn.style.borderColor  = '';
  btn.style.cursor       = '';
  ['rec-diagnosis', 'rec-medicines', 'rec-next-visit', 'rec-patient-id'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.removeAttribute('readonly');
  });
  document.getElementById('download-report-btn').style.display = 'none';

  // Store demographic context for the PDF report
  _apptContext = {
    patient_id:     patientId,
    patient_name:   patientName   || '',
    patient_age:    patientAge    || null,
    patient_gender: patientGender || ''
  };
  showToast(`Patient #${patientId} loaded.`, 'info');
}

async function submitRecord(e) {
  e.preventDefault();

  const patient_id      = document.getElementById('rec-patient-id').value;
  const appointment_id  = document.getElementById('rec-appointment-id').value;
  const next_visit_date = document.getElementById('rec-next-visit').value;
  const diagnosis       = document.getElementById('rec-diagnosis').value;
  const medicines       = document.getElementById('rec-medicines').value;
  const btn             = document.getElementById('record-btn');

  if (!appointment_id) {
    showToast("Please use the 'Add Record' button from Appointments tab.", 'error');
    return;
  }

  // Guard: if already saved for this appointment, block silently
  if (btn.dataset.saved === 'true') {
    showToast('Record already saved for this appointment.', 'info');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Saving...';

  try {
    const params = new URLSearchParams({ patient_id, diagnosis, medicines, appointment_id });
    if (next_visit_date) params.append('next_visit_date', next_visit_date);

    const res  = await fetch(`${API}/doctor/add-record?${params}`, {
      method: 'POST',
      headers: authHeaders()
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to add record');
    
    showToast('Record saved. Appointment marked as completed!', 'success');

    // Store for report
    _lastRecord = {
      patient_id,
      patient_name:   _apptContext.patient_name   || '',
      patient_age:    _apptContext.patient_age    || null,
      patient_gender: _apptContext.patient_gender || '',
      diagnosis,
      medicines,
      next_visit_date
    };
    document.getElementById('download-report-btn').style.display = 'inline-flex';

    // Permanently lock the form — prevents any re-submission for this appointment
    btn.dataset.saved     = 'true';
    btn.disabled          = true;
    btn.textContent       = '✓ Saved';
    btn.style.background  = 'var(--success)';
    btn.style.borderColor = 'var(--success)';
    btn.style.cursor      = 'default';
    // Clear hidden appointment_id so any accidental network retry hits the backend guard
    document.getElementById('rec-appointment-id').value = '';
    // Make all fields read-only
    ['rec-diagnosis', 'rec-medicines', 'rec-next-visit', 'rec-patient-id'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('readonly', true);
    });

    loadAppointments();
    loadStats();

  } catch (err) {
    showToast(err.message, 'error');
    // Re-enable only on failure so the doctor can correct and retry
    btn.disabled    = false;
    btn.textContent = 'Save Medical Record';
  }
  // NO finally re-enable — success keeps the button permanently locked
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
  const r = _lastRecord;

  // Patient demographics
  const patientName   = r.patient_name   || '—';
  const patientAge    = r.patient_age    ? `${r.patient_age} yrs` : '—';
  const genderRaw     = r.patient_gender || '';
  const patientGender = genderRaw ? (genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1)) : '—';

  const nextVisitBlock = r.next_visit_date
    ? `<div class="next-visit-block">
        <span class="nv-icon">📅</span>
        <div>
          <div class="nv-label">Follow-up / Next Visit</div>
          <div class="nv-date">${escHtml(r.next_visit_date)}</div>
        </div>
       </div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Prescription — Hospitum Core</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; background: #eef2f7; padding: 36px 20px; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* ── Outer wrapper ── */
  .rx-wrap { max-width: 800px; margin: 0 auto; }

  /* ── Header ── */
  .rx-header {
    background: linear-gradient(135deg, #0b1120 0%, #0d2240 60%, #0f2e5e 100%);
    border-radius: 16px 16px 0 0;
    padding: 0;
    overflow: hidden;
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: stretch;
  }
  .rx-header::after {
    content: 'Rx';
    position: absolute;
    right: -10px; top: -18px;
    font-size: 9rem; font-weight: 800; color: rgba(255,255,255,0.04);
    line-height: 1; pointer-events: none; user-select: none;
  }
  .rx-header-left { padding: 32px 36px; flex: 1; }
  .rx-brand-tag { font-size: 0.65rem; letter-spacing: 3px; text-transform: uppercase; color: #38bdf8; font-weight: 700; margin-bottom: 12px; }
  .rx-doctor-name { font-size: 1.75rem; font-weight: 800; color: #ffffff; line-height: 1.2; }
  .rx-doctor-sub { font-size: 0.875rem; color: rgba(255,255,255,0.55); margin-top: 6px; }
  .rx-header-right {
    background: rgba(255,255,255,0.04);
    border-left: 1px solid rgba(255,255,255,0.07);
    padding: 32px 32px;
    display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 8px;
    min-width: 200px;
  }
  .rx-stamp {
    width: 60px; height: 60px;
    border: 2.5px solid rgba(6,182,212,0.6);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; font-weight: 800; color: #06b6d4;
    margin-bottom: 8px;
  }
  .rx-hospital-name { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.8); text-align: right; }
  .rx-ref { font-size: 0.68rem; color: rgba(255,255,255,0.35); text-align: right; }

  /* ── Cyan accent strip ── */
  .rx-stripe { height: 5px; background: linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6); }

  /* ── Issue meta bar ── */
  .rx-meta {
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    display: flex; gap: 0;
  }
  .rx-meta-cell {
    flex: 1; padding: 16px 24px;
    border-right: 1px solid #e2e8f0;
  }
  .rx-meta-cell:last-child { border-right: none; }
  .rx-meta-cell .ml { font-size: 0.63rem; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; font-weight: 600; margin-bottom: 4px; }
  .rx-meta-cell .mv { font-size: 0.92rem; font-weight: 700; color: #0f172a; }

  /* ── Main body ── */
  .rx-body { background: #fff; padding: 32px 36px; }

  /* ── Patient + Doctor info two-column ── */
  .info-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px;
  }
  .info-box {
    border-radius: 10px; padding: 18px 20px;
  }
  .info-box.patient { background: #f0f9ff; border: 1px solid #bae6fd; }
  .info-box.doctor  { background: #fafafa; border: 1px solid #e2e8f0; }
  .info-box-title {
    font-size: 0.62rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;
    padding-bottom: 8px; margin-bottom: 12px; border-bottom: 1.5px solid;
  }
  .info-box.patient .info-box-title { color: #0369a1; border-color: #bae6fd; }
  .info-box.doctor  .info-box-title { color: #475569; border-color: #e2e8f0; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .info-row:last-child { margin-bottom: 0; }
  .info-row .irl { font-size: 0.72rem; color: #94a3b8; }
  .info-row .irv { font-size: 0.82rem; font-weight: 600; color: #0f172a; text-align: right; }
  .info-box.patient .irv { color: #0c4a6e; }

  /* ── Section titles ── */
  .sec-hd {
    display: flex; align-items: center; gap: 10px;
    font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.8px; font-weight: 700;
    color: #06b6d4; margin: 24px 0 10px;
  }
  .sec-hd::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
  .sec-body {
    font-size: 0.92rem; line-height: 1.85; white-space: pre-wrap; color: #1e293b;
    background: #f8fafc; border-radius: 8px; padding: 14px 18px;
    border-left: 3px solid #06b6d4;
  }
  .sec-body.green { border-left-color: #10b981; background: #f0fdf4; }

  /* ── Next visit ── */
  .next-visit-block {
    display: flex; align-items: center; gap: 14px;
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border: 1px solid #6ee7b7; border-radius: 10px;
    padding: 14px 20px; margin: 20px 0;
  }
  .nv-icon { font-size: 1.5rem; }
  .nv-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; color: #059669; font-weight: 700; }
  .nv-date { font-size: 1rem; font-weight: 800; color: #065f46; margin-top: 2px; }

  /* ── Signature ── */
  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
  .sig-disclaimer { font-size: 0.72rem; color: #94a3b8; max-width: 300px; line-height: 1.5; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 1.5px solid #334155; padding-top: 8px; min-width: 200px; }
  .sig-name { font-weight: 700; font-size: 0.92rem; color: #0f172a; }
  .sig-spec { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
  .sig-reg  { font-size: 0.68rem; color: #94a3b8; margin-top: 1px; }

  /* ── Footer ── */
  .rx-footer {
    background: #0b1120; border-radius: 0 0 16px 16px;
    padding: 16px 36px; display: flex; justify-content: space-between; align-items: center;
  }
  .rx-footer .fl { font-size: 0.7rem; color: rgba(255,255,255,0.35); }
  .rx-footer .fr { font-size: 0.68rem; color: #06b6d4; font-weight: 600; letter-spacing: 0.5px; }

  @media print {
    body { background: #fff; padding: 0; }
    .rx-wrap { max-width: 100%; }
    .rx-footer { -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="rx-wrap">

  <!-- ── HEADER ── -->
  <div class="rx-header">
    <div class="rx-header-left">
      <div class="rx-brand-tag">Hospitum Core &mdash; Medical Prescription</div>
      <div class="rx-doctor-name">Dr. ${escHtml(doctorName)}</div>
      <div class="rx-doctor-sub">${escHtml(specialization)}</div>
    </div>
    <div class="rx-header-right">
      <div class="rx-stamp">Rx</div>
      <div class="rx-hospital-name">${escHtml(hospitalName) || 'Hospitum Core'}</div>
      <div class="rx-ref">Digital Prescription</div>
    </div>
  </div>

  <!-- ── CYAN STRIP ── -->
  <div class="rx-stripe"></div>

  <!-- ── ISSUE DATE / TIME ── -->
  <div class="rx-meta">
    <div class="rx-meta-cell">
      <div class="ml">Issue Date</div>
      <div class="mv">${dateStr}</div>
    </div>
    <div class="rx-meta-cell">
      <div class="ml">Issue Time</div>
      <div class="mv">${timeStr}</div>
    </div>
    <div class="rx-meta-cell">
      <div class="ml">Prescription By</div>
      <div class="mv">Dr. ${escHtml(doctorName)}</div>
    </div>
  </div>

  <!-- ── BODY ── -->
  <div class="rx-body">

    <!-- Patient + Doctor Info Grid -->
    <div class="info-grid">
      <div class="info-box patient">
        <div class="info-box-title">Patient Details</div>
        <div class="info-row"><span class="irl">Full Name</span><span class="irv">${escHtml(patientName)}</span></div>
        <div class="info-row"><span class="irl">Age</span><span class="irv">${escHtml(patientAge)}</span></div>
        <div class="info-row"><span class="irl">Gender</span><span class="irv">${escHtml(patientGender)}</span></div>
        <div class="info-row"><span class="irl">Patient ID</span><span class="irv">#${escHtml(String(r.patient_id))}</span></div>
      </div>
      <div class="info-box doctor">
        <div class="info-box-title">Attending Physician</div>
        <div class="info-row"><span class="irl">Doctor</span><span class="irv">Dr. ${escHtml(doctorName)}</span></div>
        <div class="info-row"><span class="irl">Specialization</span><span class="irv">${escHtml(specialization) || '—'}</span></div>
        <div class="info-row"><span class="irl">Hospital</span><span class="irv">${escHtml(hospitalName) || '—'}</span></div>
        <div class="info-row"><span class="irl">Date</span><span class="irv">${dateStr}</span></div>
      </div>
    </div>

    <!-- Next visit (only if set) -->
    ${nextVisitBlock}

    <!-- Diagnosis -->
    <div class="sec-hd">Diagnosis &amp; Complaint</div>
    <div class="sec-body">${escHtml(r.diagnosis)}</div>

    <!-- Prescription -->
    <div class="sec-hd">Prescription &amp; Medicines</div>
    <div class="sec-body green">${escHtml(r.medicines)}</div>

    <!-- Signature -->
    <div class="sig-row">
      <div class="sig-disclaimer">
        This prescription is digitally generated and valid only when issued through Hospitum Core. Retain a copy for your records.
      </div>
      <div class="sig-block">
        <div class="sig-line">
          <div class="sig-name">Dr. ${escHtml(doctorName)}</div>
          <div class="sig-spec">${escHtml(specialization)}</div>
          <div class="sig-reg">${escHtml(hospitalName)}</div>
        </div>
      </div>
    </div>

  </div><!-- /rx-body -->

  <!-- ── FOOTER ── -->
  <div class="rx-footer">
    <div class="fl">Generated on ${dateStr} at ${timeStr} &bull; Hospitum Core EHR System</div>
    <div class="fr">hospitumcore.health</div>
  </div>

</div><!-- /rx-wrap -->
</body>
</html>`;



  const win = window.open('', '_blank', 'width=900,height=720');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 700);
}

/* ── PATIENT LOOKUP ──────────────────────────────────────────────────────── */
function clearLookup() {
  const inp = document.getElementById('lookup-patient-id');
  if (inp) inp.value = '';
  const res = document.getElementById('lookup-results');
  if (res) res.innerHTML = '';
}

async function lookupPatient() {
  const idVal = (document.getElementById('lookup-patient-id').value || '').trim();
  const pid   = parseInt(idVal, 10);
  const res   = document.getElementById('lookup-results');
  const btn   = document.getElementById('lookup-btn');

  if (!pid || pid < 1) {
    res.innerHTML = `<div class="card" style="padding:20px; color:var(--danger); text-align:center;">⚠️ Please enter a valid Patient ID.</div>`;
    return;
  }

  // Loading state
  btn.disabled    = true;
  btn.textContent = 'Searching…';
  res.innerHTML   = `<div class="card" style="padding:32px; text-align:center; color:var(--text-muted);">⏳ Loading patient history…</div>`;

  try {
    const response = await fetch(`${API}/doctor/patient-history/${pid}`, { headers: authHeaders() });
    const data     = await response.json();

    if (!response.ok) {
      res.innerHTML = `<div class="card" style="padding:32px; text-align:center;">
        <div style="font-size:2.5rem; margin-bottom:12px;">🔍</div>
        <strong style="color:var(--danger);">${escHtml(data.detail || 'Patient not found')}</strong>
        <p style="margin-top:8px; color:var(--text-muted); font-size:0.9rem;">Verify the Patient ID and try again.</p>
      </div>`;
      return;
    }

    const p       = data.patient;
    const records = data.records;
    const gender  = p.gender ? (p.gender.charAt(0).toUpperCase() + p.gender.slice(1)) : '—';
    const age     = p.age    ? `${p.age} yrs` : '—';
    const phone   = p.phone  || '—';
    const email   = p.email  || '—';

    // ── Patient Demographics Card ─────────────────────────────────────────
    const patientCard = `
      <div class="card mb-6" style="border-left:4px solid var(--accent-primary); background:linear-gradient(135deg,var(--bg-card) 0%,rgba(6,182,212,0.04) 100%);">
        <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
          <div style="width:60px;height:60px;border-radius:50%;background:var(--accent-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;flex-shrink:0;">${escHtml(p.name.charAt(0).toUpperCase())}</div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <h3 style="margin:0;font-size:1.2rem;">${escHtml(p.name)}</h3>
              <span class="badge badge-booked">Patient #${p.id}</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-top:14px;">
              <div><div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);">Age</div><div style="font-weight:600;margin-top:2px;">${escHtml(age)}</div></div>
              <div><div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);">Gender</div><div style="font-weight:600;margin-top:2px;">${escHtml(gender)}</div></div>
              <div><div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);">Phone</div><div style="font-weight:600;margin-top:2px;">${escHtml(phone)}</div></div>
              <div><div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);">Email</div><div style="font-weight:600;margin-top:2px;font-size:0.88rem;">${escHtml(email)}</div></div>
            </div>
          </div>
        </div>
      </div>`;

    // ── Medical Records ───────────────────────────────────────────────────
    let recordsHtml = '';
    if (records.length === 0) {
      recordsHtml = `
        <div class="card" style="padding:48px;text-align:center;color:var(--text-muted);">
          <div style="font-size:2.5rem;margin-bottom:12px;">📂</div>
          <strong>No medical records found</strong>
          <p style="margin-top:6px;font-size:0.9rem;">This patient has no recorded diagnoses yet.</p>
        </div>`;
    } else {
      const rows = records.map((r, i) => {
        const d = r.created_at ? new Date(r.created_at) : null;
        const dateStr = d ? d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
        const timeStr = d ? d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '';

        const nextVisit = r.next_visit_date
          ? `<div style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,0.1);color:var(--success);border-radius:20px;padding:4px 14px;font-size:0.8rem;font-weight:600;">📅 Next Visit: ${escHtml(r.next_visit_date)}</div>`
          : '';

        const docLine = r.doctor_name
          ? `<span style="font-size:0.8rem;color:var(--text-muted);">Dr. ${escHtml(r.doctor_name)}${r.specialization ? ' &bull; ' + escHtml(r.specialization) : ''}${r.hospital_name ? ' &bull; ' + escHtml(r.hospital_name) : ''}</span>`
          : '';

        return `
          <div class="card mb-4" style="border-left:3px solid var(--accent-primary);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
              <div>
                <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Record #${records.length - i} &bull; ${dateStr}${timeStr ? ' at ' + timeStr : ''}</div>
                <div style="margin-top:4px;">${docLine}</div>
              </div>
            </div>
            <div style="margin-bottom:12px;">
              <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent-primary);font-weight:700;margin-bottom:6px;">Diagnosis</div>
              <div style="font-size:0.92rem;line-height:1.7;white-space:pre-wrap;">${escHtml(r.diagnosis)}</div>
            </div>
            <div>
              <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:var(--success);font-weight:700;margin-bottom:6px;">Prescription &amp; Medicines</div>
              <div style="font-size:0.92rem;line-height:1.7;white-space:pre-wrap;">${escHtml(r.medicines)}</div>
            </div>
            ${nextVisit}
          </div>`;
      }).join('');

      recordsHtml = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;font-size:1rem;">Medical Records
            <span style="color:var(--text-muted);font-weight:400;font-size:0.88rem;">(${records.length} record${records.length !== 1 ? 's' : ''} found)</span>
          </h3>
        </div>
        ${rows}`;
    }

    res.innerHTML = patientCard + recordsHtml;

  } catch (err) {
    res.innerHTML = `<div class="card" style="padding:24px;color:var(--danger);text-align:center;">❌ Error: ${escHtml(err.message)}</div>`;
  } finally {
    btn.disabled    = false;
    btn.textContent = '🔍 Search';
  }
}

/* ── Init ────────────────────────────────────────────────────────────────── */
(async function init() {
  loadDoctorProfile();
  await loadStats();
  await loadAppointments();
})();
