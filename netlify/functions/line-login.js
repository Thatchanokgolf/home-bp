const { sql, ok, bad, parse } = require('./_db');
const { signToken } = require('./_auth');
const { verifyLineToken } = require('./_line');

// POST /api/line-login  body: { id_token }
// Verifies the LINE ID token; if that LINE account is linked to an app account,
// logs in. Otherwise returns { linked: false } so the client can go register.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const { id_token } = parse(event);
  if (!id_token) return bad('Missing LINE token', 400);

  let line;
  try {
    line = await verifyLineToken(id_token);
  } catch (e) {
    return bad('LINE verification failed: ' + e.message, 401);
  }

  const rows = await sql`SELECT * FROM users WHERE line_user_id = ${line.sub}`;
  if (!rows.length) return ok({ linked: false });

  const u = rows[0];
  const safeUser = {
    id: u.id,
    email: u.email,
    hospital: u.hospital,
    hospital_id: u.hospital_id,
    username: u.username,
    first_name: u.first_name,
    last_name: u.last_name,
    role: u.role,
    shared: u.shared,
    line_linked: true,
  };
  return ok({ linked: true, user: safeUser, token: signToken(safeUser) });
};
