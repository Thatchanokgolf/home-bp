// Tiny API + session helpers shared by every page.
async function api(path, body) {
  const res = await fetch('/api/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {}
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
function setUser(u) {
  localStorage.setItem('hbp_user', JSON.stringify(u));
}
function logout() {
  localStorage.removeItem('hbp_user');
  location.href = 'index.html';
}
// Redirect to login if not authenticated; optionally require a role.
function requireAuth(role) {
  const u = getUser();
  if (!u) {
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
