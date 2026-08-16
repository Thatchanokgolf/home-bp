const { ok, bad } = require('./_db');
const { verify, signShareToken } = require('./_auth');

// POST /api/share-token
// Authenticated. Issues a 30-minute read-only token for the CALLER's own data,
// used to build a "share to doctor" link. A user can only share their own record.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);

  return ok({ token: signShareToken(auth.id), expires_in: 1800 });
};
