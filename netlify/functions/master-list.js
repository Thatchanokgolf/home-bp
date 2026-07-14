const { sql, ok, bad } = require('./_db');
const { verify } = require('./_auth');

// POST /api/master-list -> every user (no passwords). Role 'master' only.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);
  if (auth.role !== 'master') return bad('Forbidden', 403);

  const rows = await sql`
    SELECT id, email, hospital, hospital_id, username, first_name, last_name, role, shared
    FROM users
    ORDER BY id`;
  return ok({ rows });
};
