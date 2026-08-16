const { sql, ok, bad, parse } = require('./_db');
const { verify, canViewUser, verifyShareToken } = require('./_auth');

// POST /api/avg-list  body: { user_id, from, to } OR { share_token, from, to }
// Returns the averaged rows plus a summary block.
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
    SELECT id, to_char(date, 'YYYY-MM-DD') AS date, ampm, systolic, diastolic, heart_rate
    FROM avg_bp
    WHERE user_id = ${user_id}
      AND date BETWEEN ${from} AND ${to}
    ORDER BY date, ampm`;

  const num = (x) => (x == null ? null : Number(x));
  const avg = (arr, key) =>
    arr.length ? arr.reduce((a, r) => a + Number(r[key]), 0) / arr.length : null;

  const amRows = rows.filter((r) => r.ampm === 'AM');
  const pmRows = rows.filter((r) => r.ampm === 'PM');

  // Frequency counts DAYS measured (not AM/PM entries): one per calendar day
  // that has any reading, out of the total days in the range.
  const f = Date.parse(from), tt = Date.parse(to);
  const rangeDays = !isNaN(f) && !isNaN(tt) && tt >= f
    ? Math.floor((tt - f) / 86400000) + 1
    : 0;
  const daysMeasured = new Set(rows.map((r) => r.date)).size;

  const summary = {
    am: { systolic: num(avg(amRows, 'systolic')), diastolic: num(avg(amRows, 'diastolic')), heart_rate: num(avg(amRows, 'heart_rate')) },
    pm: { systolic: num(avg(pmRows, 'systolic')), diastolic: num(avg(pmRows, 'diastolic')), heart_rate: num(avg(pmRows, 'heart_rate')) },
    all: { systolic: num(avg(rows, 'systolic')), diastolic: num(avg(rows, 'diastolic')), heart_rate: num(avg(rows, 'heart_rate')) },
    count: daysMeasured,
    max_expected: rangeDays,
    days: rangeDays,
  };

  return ok({ rows, summary });
};
