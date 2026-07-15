const bcrypt = require('bcryptjs');
const { sql, ok, bad, parse } = require('./_db');
const { signToken } = require('./_auth');

// POST /api/login
// body: { identifier, password }  identifier = numeric ID, e-mail, or username
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const { identifier, password } = parse(event);
  if (!identifier || !password) return bad('Please enter ID/e-mail/username and password');

  const idf = String(identifier).trim();
  let rows;
  if (/^\d+$/.test(idf)) {
    rows = await sql`SELECT * FROM users WHERE id = ${Number(idf)}`;
  } else {
    // Case-insensitive match on e-mail or username.
    rows = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${idf}) OR LOWER(username) = LOWER(${idf})`;
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
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    shared: user.shared,
  };

  return ok({ user: safeUser, token: signToken(safeUser) });
};
