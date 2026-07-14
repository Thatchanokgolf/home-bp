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
