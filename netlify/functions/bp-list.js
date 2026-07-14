const { sql, ok, bad, parse } = require('./_db');
const { verify, canViewUser } = require('./_auth');

// POST /api/bp-list  body: { user_id, from, to }  -> raw BP readings
// Allowed for the owner, or an admin viewing a shared user.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);

  const { user_id, from, to } = parse(event);
  if (!user_id) return bad('Missing user');
  if (!(await canViewUser(auth, user_id, sql))) return bad('Forbidden', 403);

  const rows = await sql`
    SELECT id, date, time, ampm, systolic, diastolic, heart_rate
    FROM bp_readings
    WHERE user_id = ${user_id}
      AND date BETWEEN ${from} AND ${to}
    ORDER BY date, time`;

  return ok({ rows });
};
