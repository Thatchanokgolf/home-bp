const { sql, ok, bad, parse } = require('./_db');
const { verify } = require('./_auth');

// POST /api/admin-search  body: { query }
// Admin only. Searches shared=true users by ID or HN (hospital_id).
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);
  if (auth.role !== 'admin' && auth.role !== 'master') return bad('Forbidden', 403);

  const { query } = parse(event);
  if (!query || !String(query).trim()) return bad('Please enter an ID or HN to search');
  const q = String(query).trim();

  let rows;
  if (/^\d+$/.test(q)) {
    rows = await sql`
      SELECT id, email, hospital, hospital_id, shared
      FROM users
      WHERE shared = true AND role = 'user'
        AND (id = ${Number(q)} OR hospital_id = ${q})
      ORDER BY id`;
  } else {
    rows = await sql`
      SELECT id, email, hospital, hospital_id, shared
      FROM users
      WHERE shared = true AND role = 'user' AND hospital_id = ${q}
      ORDER BY id`;
  }

  return ok({ rows });
};
