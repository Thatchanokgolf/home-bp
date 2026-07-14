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
  if (res.status === 401) {
    clearSession();
    if (!/index\.html$|\/$/.test(location.pathname)) location.href = 'index.html';
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
// Redirect to login if not authenticated; optionally require a role.
function requireAuth(role) {
  const u = getUser();
  if (!u || !getToken()) {
    clearSession();
    location.href = 'index.html';
    return null;
  }
  if (role && u.role !== role) {
    location.href = u.role === 'admin' ? 'admin.html' : 'user.html';
    return null;
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
