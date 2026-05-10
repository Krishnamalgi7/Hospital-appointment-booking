/* ═══════════════════════════════════════════════════════════════════════════
   auth.js  — Login & Register logic
   ═══════════════════════════════════════════════════════════════════════════ */

const API = 'http://127.0.0.1:8000';

/* ── Redirect if already logged in ─────────────────────────────────────── */
(function guardAuth() {
  const token = localStorage.getItem('token');
  const role  = localStorage.getItem('role');
  if (token && role) {
    if      (role === 'doctor') window.location.href = 'doctor.html';
    else if (role === 'admin')  window.location.href = 'admin.html';
    else                        window.location.href = 'patient.html';
  }
})();

/* ── Tab Switcher ────────────────────────────────────────────────────────── */
function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('active',    tab === 'login');
  document.getElementById('register-form').classList.toggle('active', tab === 'register');
  document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  clearAlert();
}

/* ── Password Visibility ─────────────────────────────────────────────────── */
function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (inp.type === 'password') { inp.type = 'text';     btn.textContent = '🙈'; }
  else                          { inp.type = 'password'; btn.textContent = '👁'; }
}

/* ── Alert helpers ───────────────────────────────────────────────────────── */
function showAlert(msg, type = 'error') {
  const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  document.getElementById('alert-box').innerHTML =
    `<div class="alert alert-${type}">${icon} ${msg}</div>`;
}
function clearAlert() {
  document.getElementById('alert-box').innerHTML = '';
}

/* ── Toast ───────────────────────────────────────────────────────────────── */
function showToast(msg, type = 'success') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icons[type]} ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

/* ── Button loading state ────────────────────────────────────────────────── */
function setLoading(btnId, loading, label = '') {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.classList.toggle('btn-loading', loading);
  btn.innerHTML = loading ? `<span class="spinner"></span> Please wait…` : label;
}

/* ── Redirect helper based on role ──────────────────────────────────────── */
function redirectByRole(role) {
  if      (role === 'doctor') window.location.href = 'doctor.html';
  else if (role === 'admin')  window.location.href = 'admin.html';
  else                        window.location.href = 'patient.html';
}

/* ── LOGIN ───────────────────────────────────────────────────────────────── */
async function handleLogin(e) {
  e.preventDefault();
  clearAlert();

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showAlert('Please fill in all fields.');
    return;
  }

  setLoading('login-btn', true);

  try {
    const params = new URLSearchParams({ email, password });
    const res = await fetch(`${API}/auth/login?${params}`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      showAlert(data.detail || 'Invalid credentials. Please try again.');
      return;
    }

    /* Store auth data */
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('role',  data.role);
    localStorage.setItem('name',  data.name);

    /* Decode JWT to get user_id */
    try {
      const payload = JSON.parse(atob(data.access_token.split('.')[1]));
      localStorage.setItem('user_id', payload.user_id ?? '');
    } catch {}

    showToast('Login successful! Redirecting…', 'success');

    setTimeout(() => redirectByRole(data.role), 800);

  } catch (err) {
    showAlert('Cannot connect to server. Is the backend running?');
    console.error(err);
  } finally {
    setLoading('login-btn', false, 'Sign In');
  }
}

/* ── REGISTER ────────────────────────────────────────────────────────────── */
async function handleRegister(e) {
  e.preventDefault();
  clearAlert();

  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const age      = parseInt(document.getElementById('reg-age').value, 10);
  const gender   = document.getElementById('reg-gender').value;
  const phone    = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;

  // Validation
  if (!name || !email || !gender || !phone || !password || !confirm) {
    showAlert('Please fill in all fields.');
    return;
  }
  if (isNaN(age) || age <= 0 || age > 120) {
    showAlert('Please enter a valid age (1–120).');
    return;
  }
  if (!/^[0-9+\-\s]{7,15}$/.test(phone)) {
    showAlert('Please enter a valid phone number (7–15 digits).');
    return;
  }
  if (password.length < 6) {
    showAlert('Password must be at least 6 characters.');
    return;
  }
  if (password !== confirm) {
    showAlert('Passwords do not match.');
    return;
  }

  setLoading('register-btn', true);

  try {
    const params = new URLSearchParams({ name, email, password, role: 'patient', age, gender, phone });
    const res  = await fetch(`${API}/auth/register?${params}`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      showAlert(data.detail || 'Registration failed. Try a different email.');
      return;
    }

    showAlert('Account created successfully! Please sign in.', 'success');
    setTimeout(() => switchTab('login'), 1200);

  } catch (err) {
    showAlert('Cannot connect to server. Is the backend running?');
    console.error(err);
  } finally {
    setLoading('register-btn', false, 'Create Patient Account');
  }
}
