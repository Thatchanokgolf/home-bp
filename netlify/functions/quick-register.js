const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sql, ok, bad, parse } = require('./_db');
const { signToken } = require('./_auth');
const { verifyLineAccessToken } = require('./_line');

// Random 20-letter code for QR login. Only its bcrypt hash is stored.
function genCode(n = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += chars[bytes[i] % chars.length];
  return s;
}

// Random 4-digit password (0000-9999), shown to the user once.
function genPassword() {
  return String(crypto.randomInt(0, 10000)).padStart(4, '0');
}

// POST /api/quick-register  body: { line_access_token? }
// One-tap registration: no user input. Generates a username "a<id>" and a random
// 4-digit password. Optionally links a LINE account (used when a LINE user with no
// linked account is sent here to auto-register).
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const b = parse(event);

  // Optional: link a LINE account. Verify the token and ensure it's unused first.
  let lineSub = null;
  if (b.line_access_token) {
    try {
      const line = await verifyLineAccessToken(b.line_access_token);
      lineSub = line.sub;
    } catch (e) {
      return bad('LINE verification failed: ' + e.message, 400);
    }
    if ((await sql`SELECT 1 FROM users WHERE line_user_id = ${lineSub}`).length)
      return bad('This LINE account is already linked to another account', 409);
  }

  const password = genPassword();
  const hash = await bcrypt.hash(password, 10);
  const qrCode = genCode(20);
  const qrHash = await bcrypt.hash(qrCode, 10);

  // Insert first (username depends on the generated id), then set username "a<id>".
  // New accounts default to shared = false (not visible to hospital staff until
  // the user or a master opts in).
  const rows = await sql`
    INSERT INTO users (role, password, shared, hash_password, line_user_id)
    VALUES ('user', ${hash}, false, ${qrHash}, ${lineSub})
    RETURNING id, role, shared`;
  const id = rows[0].id;

  const upd = await sql`
    UPDATE users SET username = ${'a' + id} WHERE id = ${id}
    RETURNING id, email, hospital, hospital_id, username, first_name, last_name, role, shared`;
  const u = upd[0];

  const user = {
    id: u.id,
    email: u.email,
    hospital: u.hospital,
    hospital_id: u.hospital_id,
    username: u.username,
    first_name: u.first_name,
    last_name: u.last_name,
    role: u.role,
    shared: u.shared,
    line_linked: !!lineSub,
  };

  // password + qr_code are returned in plaintext once so the client can show them.
  return ok({ user, password, qr_code: qrCode, token: signToken(user) });
};
