const { sql, ok, bad } = require('./_db');
const { verify } = require('./_auth');

// POST /api/bp-recent -> the authenticated user's last 5 readings (newest first).
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);

  const rows = await sql`
    SELECT id, to_char(date, 'YYYY-MM-DD') AS date, time, ampm, systolic, diastolic, heart_rate
    FROM bp_readings
    WHERE user_id = ${auth.id}
    ORDER BY date DESC, time DESC
    LIMIT 5`;

  return ok({ rows });
};
