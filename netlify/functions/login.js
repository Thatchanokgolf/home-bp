const bcrypt = require('bcryptjs');
const { sql, ok, bad, parse } = require('./_db');
const { signToken } = require('./_auth');

// POST /api/login
// body: { identifier, password }  identifier = numeric ID or e-mail
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const { identifier, password } = parse(event);
  if (!identifier || !password) return bad('Please enter ID/e-mail and password');

  let rows;
  if (/^\d+$/.test(String(identifier).trim())) {
    rows = await sql`SELECT * FROM users WHERE id = ${Number(identifier)}`;
  } else {
    rows = await sql`SELECT * FROM users WHERE email = ${String(identifier).trim()}`;
  }
  if (!rows.length) return bad('Invalid credentials', 401);

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return bad('Invalid credentials', 401);

  const safeUser = {
    id: user.id,
    email: user.email,
    hospital: user.hospital,
    hospital_id: user.hospital_id,
    role: user.role,
    shared: user.shared,
  };

  return ok({ user: safeUser, token: signToken(safeUser) });
};
