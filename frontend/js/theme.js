/* ═══════════════════════════════════════════════════════════════════════════
   theme.js  — Light / Dark theme toggle (shared across all pages)
   Default: Light. Stored in localStorage as 'theme' = 'light' | 'dark'
   ═══════════════════════════════════════════════════════════════════════════ */

(function applyThemeEarly() {
  // Apply saved theme immediately to prevent flash
  const saved = localStorage.getItem('theme') || 'light';
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
})();

function getTheme() {
  return localStorage.getItem('theme') || 'light';
}

function setTheme(theme) {
  localStorage.setItem('theme', theme);
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  // Update all toggle buttons on the page
  updateToggleButtons();
}

function toggleTheme() {
  setTheme(getTheme() === 'light' ? 'dark' : 'light');
}

function updateToggleButtons() {
  const isDark = getTheme() === 'dark';
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    const icon = btn.querySelector('.toggle-icon');
    const label = btn.querySelector('.toggle-label');
    if (icon)  icon.textContent  = isDark ? '☀️' : '🌙';
    if (label) label.textContent = isDark ? 'Light' : 'Dark';
    btn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  });
}

// Run on DOMContentLoaded to initialize button state
document.addEventListener('DOMContentLoaded', updateToggleButtons);
