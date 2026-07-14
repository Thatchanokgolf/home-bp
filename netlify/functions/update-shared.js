const { sql, ok, bad, parse } = require('./_db');
const { verify } = require('./_auth');

// POST /api/update-shared  body: { shared }  -> toggles the caller's own share flag.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);

  const { shared } = parse(event);
  const val = shared === true || shared === 'yes';
  const rows = await sql`UPDATE users SET shared = ${val} WHERE id = ${auth.id} RETURNING shared`;
  if (!rows.length) return bad('User not found', 404);
  return ok({ shared: rows[0].shared });
};
