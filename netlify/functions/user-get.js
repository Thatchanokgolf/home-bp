const { sql, ok, bad, parse } = require('./_db');

// POST /api/user-get  body: { user_id }  -> public profile fields for the review header.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const { user_id } = parse(event);
  if (!user_id) return bad('Missing user');

  const rows = await sql`
    SELECT id, email, hospital, hospital_id, shared
    FROM users WHERE id = ${user_id}`;
  if (!rows.length) return bad('User not found', 404);

  return ok({ user: rows[0] });
};
