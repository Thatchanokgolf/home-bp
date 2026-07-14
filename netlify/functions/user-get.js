const { sql, ok, bad, parse } = require('./_db');
const { verify, canViewUser } = require('./_auth');

// POST /api/user-get  body: { user_id }  -> profile fields for the review header.
// Allowed for the owner, or an admin viewing a shared user.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);

  const { user_id } = parse(event);
  if (!user_id) return bad('Missing user');
  if (!(await canViewUser(auth, user_id, sql))) return bad('Forbidden', 403);

  const rows = await sql`
    SELECT id, email, hospital, hospital_id, username, first_name, last_name, shared
    FROM users WHERE id = ${user_id}`;
  if (!rows.length) return bad('User not found', 404);

  return ok({ user: rows[0] });
};
