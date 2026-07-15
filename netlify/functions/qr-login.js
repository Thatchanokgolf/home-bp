const bcrypt = require('bcryptjs');
const { sql, ok, bad, parse } = require('./_db');
const { signToken } = require('./_auth');

// POST /api/qr-login  body: { user_id, code }
// Verifies the QR code (20-letter string) against the stored hash_password.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const { user_id, code } = parse(event);
  if (!user_id || !code) return bad('Invalid QR code', 400);

  const rows = await sql`SELECT * FROM users WHERE id = ${user_id}`;
  if (!rows.length) return bad('Invalid QR code', 401);

  const user = rows[0];
  if (!user.hash_password) return bad('This account has no QR login code', 401);

  const match = await bcrypt.compare(String(code), user.hash_password);
  if (!match) return bad('Invalid QR code', 401);

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
