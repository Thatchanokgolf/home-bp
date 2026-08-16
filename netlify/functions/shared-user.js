const { sql, ok, bad, parse } = require('./_db');
const { verifyShareToken } = require('./_auth');

// POST /api/shared-user  body: { share_token }
// No login. Returns read-only profile fields for the shared account so the
// doctor view can show whose records these are. No e-mail, password or settings.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const { share_token } = parse(event);
  const share = verifyShareToken(share_token);
  if (!share) return bad('This link has expired or is invalid', 401);

  const rows = await sql`
    SELECT first_name, last_name, username, hospital, hospital_id
    FROM users WHERE id = ${share.uid}`;
  if (!rows.length) return bad('Not found', 404);

  return ok({ user: rows[0] });
};
