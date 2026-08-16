const { sql, ok, bad, parse } = require('./_db');
const { verify } = require('./_auth');

// POST /api/master-delete  body: { id }
// Master only. Permanently deletes a user and all of their BP data.
// Refuses to delete the caller's own account.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);
  if (auth.role !== 'master') return bad('Forbidden', 403);

  const b = parse(event);
  const id = Number(b.id);
  if (!id) return bad('Missing user id');
  if (id === Number(auth.id)) return bad('You cannot delete your own account');

  const found = await sql`SELECT id FROM users WHERE id = ${id}`;
  if (!found.length) return bad('User not found', 404);

  // Remove child rows first (BP data), then the user.
  await sql`DELETE FROM avg_bp WHERE user_id = ${id}`;
  await sql`DELETE FROM bp_readings WHERE user_id = ${id}`;
  await sql`DELETE FROM users WHERE id = ${id}`;

  return ok({ deleted: id });
};
