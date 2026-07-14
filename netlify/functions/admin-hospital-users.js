const { sql, ok, bad, parse } = require('./_db');
const { verify } = require('./_auth');

const PAGE = 100;

// POST /api/admin-hospital-users  body: { page }
// Admin/master only. Lists shared users from the admin's OWN hospital,
// 100 per page with next/previous support.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);
  if (auth.role !== 'admin' && auth.role !== 'master') return bad('Forbidden', 403);

  const { page } = parse(event);
  const p = Math.max(0, Number(page) || 0);

  const me = await sql`SELECT hospital FROM users WHERE id = ${auth.id}`;
  const hospital = me.length ? me[0].hospital : null;
  if (!hospital) return ok({ rows: [], page: p, hasNext: false, hospital: null });

  // Fetch one extra row to detect whether a next page exists.
  const rows = await sql`
    SELECT id, email, hospital, hospital_id, username, first_name, last_name, shared
    FROM users
    WHERE hospital = ${hospital} AND shared = true AND role = 'user'
    ORDER BY id
    LIMIT ${PAGE + 1} OFFSET ${p * PAGE}`;

  const hasNext = rows.length > PAGE;
  return ok({ rows: rows.slice(0, PAGE), page: p, hasNext, hospital });
};
