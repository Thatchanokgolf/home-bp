const { sql, ok, bad, parse } = require('./_db');
const { verify, canViewUser, verifyShareToken } = require('./_auth');

// POST /api/bp-list  body: { user_id, from, to } OR { share_token, from, to }
// Allowed for the owner, an admin viewing a shared user, or a read-only
// "share to doctor" token (which fixes the user_id to the token's owner).
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const body = parse(event);
  const { from, to } = body;

  let user_id;
  const share = verifyShareToken(body.share_token);
  if (share) {
    user_id = share.uid; // read-only; ignore any client-supplied user_id
  } else {
    const auth = verify(event);
    if (!auth) return bad('Unauthorized', 401);
    user_id = body.user_id;
    if (!user_id) return bad('Missing user');
    if (!(await canViewUser(auth, user_id, sql))) return bad('Forbidden', 403);
  }

  const rows = await sql`
    SELECT id, to_char(date, 'YYYY-MM-DD') AS date, time, ampm, systolic, diastolic, heart_rate
    FROM bp_readings
    WHERE user_id = ${user_id}
      AND date BETWEEN ${from} AND ${to}
    ORDER BY date, time`;

  return ok({ rows });
};
