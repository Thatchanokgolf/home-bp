const { sql, ok, bad, parse } = require('./_db');

// POST /api/bp-list  body: { user_id, from, to }  -> raw BP readings
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const { user_id, from, to } = parse(event);
  if (!user_id) return bad('Missing user');

  const rows = await sql`
    SELECT id, date, time, ampm, systolic, diastolic, heart_rate
    FROM bp_readings
    WHERE user_id = ${user_id}
      AND date BETWEEN ${from} AND ${to}
    ORDER BY date, time`;

  return ok({ rows });
};
