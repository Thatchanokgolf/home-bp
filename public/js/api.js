// Tiny API + session helpers shared by every page.
function getToken() {
  return localStorage.getItem('hbp_token');
}

async function api(path, body) {
  const token = getToken();
  const res = await fetch('/api/' + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {}
  // Expired / invalid session -> clear and bounce to login.
  // Pre-login pages (login, qr-login) handle their own 401s instead of redirecting.
  if (res.status === 401) {
    clearSession();
    if (!/index\.html$|qr-login\.html$|\/$/.test(location.pathname)) location.href = 'index.html';
    throw new Error(data.error || 'Session expired, please log in again');
  }
  if (!res.ok) throw new Error(data.error || t('err_generic'));
  return data;
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('hbp_user'));
  } catch {
    return null;
  }
}
// Persist the logged-in user AND their auth token together.
function setSession(user, token) {
  localStorage.setItem('hbp_user', JSON.stringify(user));
  if (token) localStorage.setItem('hbp_token', token);
}
function clearSession() {
  localStorage.removeItem('hbp_user');
  localStorage.removeItem('hbp_token');
}
function logout() {
  clearSession();
  location.href = 'index.html';
}
// Redirect to login if not authenticated; optionally require a role (string or array).
function requireAuth(role) {
  const u = getUser();
  if (!u || !getToken()) {
    clearSession();
    location.href = 'index.html';
    return null;
  }
  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(u.role)) {
      location.href = u.role === 'admin' ? 'admin.html' : u.role === 'master' ? 'master.html' : 'user.html';
      return null;
    }
  }
  return u;
}

// yyyy-mm-dd helpers in LOCAL time
function ymd(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ----- display formatting -----
// 'YYYY-MM-DD' (or Date) -> 'DD/MM/YYYY'
function fmtDate(d) {
  if (!d) return '';
  const s = typeof d === 'string' ? d.slice(0, 10) : ymd(d);
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}
function fmtHM(timeStr) {
  return String(timeStr || '').slice(0, 5); // HH:MM
}
// date + hour:minute -> 'DD/MM/YYYY HH:MM'
function fmtDateHM(dateStr, timeStr) {
  return `${fmtDate(dateStr)} ${fmtHM(timeStr)}`.trim();
}

// Greeting for the top panel. Thai precedes the first name with 'คุณ'.
function greetingName(u) {
  if (!u) return '';
  const fn = (u.first_name || '').trim();
  const ln = (u.last_name || '').trim();
  if (fn || ln) {
    const name = `${fn} ${ln}`.trim();
    return getLang() === 'th' ? `คุณ${name}` : name;
  }
  return u.username || u.email || 'ID ' + u.id;
}

// Fixed copyright bar, bottom-left of every page.
function renderFooter() {
  if (document.getElementById('hbpFooter')) return;
  const f = document.createElement('footer');
  f.id = 'hbpFooter';
  f.className = 'fixed bottom-0 left-0 text-xs text-slate-400 px-3 py-1 z-40';
  f.textContent = t('copyright');
  document.body.appendChild(f);
}

// ----- dark mode (logged-in pages) -----
// Reskins standard utility classes when <html> has .hbp-dark, using the same
// gradient as the login page. Only active on pages that render #themeToggle.
function getTheme() {
  return localStorage.getItem('hbp_theme') || 'light';
}
function applyTheme() {
  const dark = getTheme() === 'dark';
  document.documentElement.classList.toggle('hbp-dark', dark);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = dark ? '☀️' : '🌙';
  if (typeof window.onThemeChange === 'function') window.onThemeChange();
}
function toggleTheme() {
  localStorage.setItem('hbp_theme', getTheme() === 'dark' ? 'light' : 'dark');
  applyTheme();
}
function injectDarkCss() {
  if (document.getElementById('hbpDarkCss')) return;
  const s = document.createElement('style');
  s.id = 'hbpDarkCss';
  s.textContent = `
    .hbp-dark .bg-slate-100 {
      background:
        radial-gradient(1200px 600px at 15% -10%, rgba(99,102,241,0.28), transparent 60%),
        radial-gradient(900px 500px at 110% 20%, rgba(6,182,212,0.20), transparent 55%),
        linear-gradient(160deg, #05060a 0%, #0b1020 55%, #05060a 100%) !important;
      background-attachment: fixed !important;
    }
    .hbp-dark body { background: #05060a; color: #e5e7eb; }
    .hbp-dark .bg-white { background: rgba(17,20,32,0.82) !important; }
    /* Bordered buttons/links (header, modal Cancel) need a visible surface. */
    .hbp-dark button.border, .hbp-dark a.border { background: rgba(255,255,255,0.06) !important; }
    .hbp-dark .bg-slate-50 { background: rgba(255,255,255,0.05) !important; }
    .hbp-dark .text-slate-800 { color: #e5e7eb !important; }
    .hbp-dark .text-slate-700 { color: #d8dee9 !important; }
    .hbp-dark .text-slate-600 { color: #c3ccd9 !important; }
    .hbp-dark .text-slate-500 { color: #9aa6b6 !important; }
    .hbp-dark .text-slate-400 { color: #8b95a6 !important; }
    .hbp-dark .border, .hbp-dark .border-t, .hbp-dark .border-b { border-color: rgba(255,255,255,0.12) !important; }
    .hbp-dark input, .hbp-dark select, .hbp-dark textarea {
      background: rgba(255,255,255,0.06) !important;
      color: #e5e7eb !important;
      border-color: rgba(255,255,255,0.15) !important;
      color-scheme: dark;
    }
    .hbp-dark input::placeholder { color: #8b95a6 !important; }
    .hbp-dark .disabled\\:bg-slate-100:disabled { background: rgba(255,255,255,0.03) !important; }
    .hbp-dark .hover\\:bg-slate-50:hover { background: rgba(255,255,255,0.08) !important; }
  `;
  document.head.appendChild(s);
}
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('themeToggle')) {
    injectDarkCss();
    applyTheme();
  }
});
