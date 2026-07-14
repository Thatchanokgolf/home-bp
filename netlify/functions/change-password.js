const bcrypt = require('bcryptjs');
const { sql, ok, bad, parse } = require('./_db');
const { verify } = require('./_auth');

// POST /api/change-password  body: { old_password, new_password, new_password2 }
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);

  const { old_password, new_password, new_password2 } = parse(event);
  if (!old_password || !new_password || !new_password2) return bad('All fields are required');
  if (new_password !== new_password2) return bad('New passwords do not match');
  if (new_password.length < 8) return bad('Password must be at least 8 characters');
  if (!/[A-Za-z]/.test(new_password) || !/[0-9]/.test(new_password))
    return bad('Password must contain both letters and numbers');

  const rows = await sql`SELECT password FROM users WHERE id = ${auth.id}`;
  if (!rows.length) return bad('User not found', 404);
  if (!(await bcrypt.compare(old_password, rows[0].password)))
    return bad('Old password is incorrect', 401);

  const hash = await bcrypt.hash(new_password, 10);
  await sql`UPDATE users SET password = ${hash} WHERE id = ${auth.id}`;
  return ok({ changed: true });
};
