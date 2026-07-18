const { sql, ok, bad, parse } = require('./_db');
const { verify } = require('./_auth');
const { verifyLineCredential } = require('./_line');

// POST /api/line-link  body: { access_token | id_token }
// Links the caller's (authenticated) account to their LINE account.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);

  const { access_token, id_token } = parse(event);
  if (!access_token && !id_token) return bad('Missing LINE token', 400);

  let line;
  try {
    line = await verifyLineCredential({ access_token, id_token });
  } catch (e) {
    return bad('LINE verification failed: ' + e.message, 401);
  }

  // The LINE account must not already be linked to a different app account.
  const existing = await sql`SELECT id FROM users WHERE line_user_id = ${line.sub}`;
  if (existing.length && Number(existing[0].id) !== Number(auth.id))
    return bad('This LINE account is already linked to another account', 409);

  await sql`UPDATE users SET line_user_id = ${line.sub} WHERE id = ${auth.id}`;
  return ok({ linked: true });
};
