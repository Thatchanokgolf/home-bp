const { sql, ok, bad, parse } = require('./_db');
const { verify } = require('./_auth');

// POST /api/admin-search  body: { query }
// Admin/master only. Searches shared=true users in the admin's OWN hospital,
// matching by ID, HN (hospital_id), first name, or last name.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);
  if (auth.role !== 'admin' && auth.role !== 'master') return bad('Forbidden', 403);

  const { query } = parse(event);
  if (!query || !String(query).trim()) return bad('Please enter an ID, HN, or name to search');
  const q = String(query).trim();

  // Restrict results to the admin's own hospital.
  const me = await sql`SELECT hospital FROM users WHERE id = ${auth.id}`;
  const hospital = me.length ? me[0].hospital : null;
  if (!hospital) return ok({ rows: [], hospital: null });

  const numId = /^\d+$/.test(q) ? Number(q) : -1;
  const rows = await sql`
    SELECT id, hospital, hospital_id, username, first_name, last_name, shared
    FROM users
    WHERE shared = true AND role = 'user' AND hospital = ${hospital}
      AND ( id = ${numId}
         OR LOWER(hospital_id) = LOWER(${q})
         OR LOWER(first_name) = LOWER(${q})
         OR LOWER(last_name) = LOWER(${q}) )
    ORDER BY id`;

  return ok({ rows, hospital });
};
