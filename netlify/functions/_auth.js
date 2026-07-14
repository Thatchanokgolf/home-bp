// Token-based auth helpers shared by every protected function.
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const TTL = '8h';

function assertSecret() {
  if (!SECRET) throw new Error('JWT_SECRET is not configured on the server');
}

// Issue a signed token. Identity + role live INSIDE the token, so the client
// can never claim to be someone else by editing a request body.
function signToken(user) {
  assertSecret();
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: TTL });
}

// Verify the Authorization: Bearer <token> header. Returns the payload
// ({ id, role, iat, exp }) or null if missing/invalid/expired.
function verify(event) {
  if (!SECRET) return null;
  const h =
    (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    return jwt.verify(m[1], SECRET);
  } catch {
    return null;
  }
}

// May `payload` read `targetId`'s data?
//  - always yes for your own id
//  - admins may read a user ONLY if that user set shared = true
async function canViewUser(payload, targetId, sql) {
  if (Number(payload.id) === Number(targetId)) return true;
  if (payload.role === 'admin') {
    const rows = await sql`SELECT shared FROM users WHERE id = ${targetId}`;
    return rows.length > 0 && rows[0].shared === true;
  }
  return false;
}

module.exports = { signToken, verify, canViewUser };
