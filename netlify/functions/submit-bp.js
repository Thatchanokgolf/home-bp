const { sql, ok, bad, parse } = require('./_db');
const { verify } = require('./_auth');

// POST /api/submit-bp
// body: { datetime (ISO local from client), systolic, diastolic, heart_rate }
// - The reading is always saved for the authenticated user (from the token).
// - AM/PM: 00:00-11:59 => AM, 12:00-23:59 => PM
// - Recalculates the avg_bp row for that user/date/AM-PM.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);

  const { datetime, systolic, diastolic, heart_rate } = parse(event);
  const user_id = auth.id; // identity comes from the token, not the request body

  if (systolic == null || diastolic == null || heart_rate == null)
    return bad('Systolic, diastolic and heart rate are required');

  const dt = datetime ? new Date(datetime) : new Date();
  if (isNaN(dt.getTime())) return bad('Invalid date/time');

  // Use the client-provided local wall-clock parts.
  const pad = (n) => String(n).padStart(2, '0');
  const date = datetime
    ? datetime.slice(0, 10)
    : `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const time = datetime
    ? datetime.slice(11, 19) || '00:00:00'
    : `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
  const hour = Number(time.slice(0, 2));
  const ampm = hour < 12 ? 'AM' : 'PM';

  await sql`
    INSERT INTO bp_readings (user_id, date, time, ampm, systolic, diastolic, heart_rate)
    VALUES (${user_id}, ${date}, ${time}, ${ampm}, ${systolic}, ${diastolic}, ${heart_rate})`;

  // Recompute the average for this user / date / AM-PM bucket.
  const agg = await sql`
    SELECT AVG(systolic) s, AVG(diastolic) d, AVG(heart_rate) h
    FROM bp_readings
    WHERE user_id = ${user_id} AND date = ${date} AND ampm = ${ampm}`;
  const { s, d, h } = agg[0];

  await sql`
    INSERT INTO avg_bp (user_id, date, ampm, systolic, diastolic, heart_rate)
    VALUES (${user_id}, ${date}, ${ampm}, ${s}, ${d}, ${h})
    ON CONFLICT (user_id, date, ampm)
    DO UPDATE SET systolic = EXCLUDED.systolic,
                  diastolic = EXCLUDED.diastolic,
                  heart_rate = EXCLUDED.heart_rate`;

  return ok({ saved: true, date, time, ampm });
};
