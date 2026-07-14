const bcrypt = require('bcryptjs');
const { sql, ok, bad, parse } = require('./_db');
const { verify, canViewUser } = require('./_auth');

// POST /api/delete-bp  body: { reading_id, password }
// Deletes one BP reading (owner, or admin/master allowed to view the user),
// requires the logged-in person's password, then recomputes that day's average.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);

  const { reading_id, password } = parse(event);
  if (!reading_id) return bad('Missing reading');
  if (!password) return bad('Password is required to delete');

  const rows = await sql`
    SELECT id, user_id, to_char(date, 'YYYY-MM-DD') AS date, ampm
    FROM bp_readings WHERE id = ${reading_id}`;
  if (!rows.length) return bad('Reading not found', 404);
  const reading = rows[0];

  if (!(await canViewUser(auth, reading.user_id, sql))) return bad('Forbidden', 403);

  // Verify the CURRENT user's password before allowing the delete.
  const me = await sql`SELECT password FROM users WHERE id = ${auth.id}`;
  if (!me.length || !(await bcrypt.compare(password, me[0].password)))
    return bad('Incorrect password', 401);

  await sql`DELETE FROM bp_readings WHERE id = ${reading_id}`;

  // Recompute (or remove) the avg_bp row for that user / date / AM-PM.
  const agg = await sql`
    SELECT AVG(systolic) s, AVG(diastolic) d, AVG(heart_rate) h
    FROM bp_readings
    WHERE user_id = ${reading.user_id} AND date = ${reading.date} AND ampm = ${reading.ampm}`;

  if (agg[0].s == null) {
    await sql`DELETE FROM avg_bp
      WHERE user_id = ${reading.user_id} AND date = ${reading.date} AND ampm = ${reading.ampm}`;
  } else {
    await sql`
      INSERT INTO avg_bp (user_id, date, ampm, systolic, diastolic, heart_rate)
      VALUES (${reading.user_id}, ${reading.date}, ${reading.ampm}, ${agg[0].s}, ${agg[0].d}, ${agg[0].h})
      ON CONFLICT (user_id, date, ampm)
      DO UPDATE SET systolic = EXCLUDED.systolic,
                    diastolic = EXCLUDED.diastolic,
                    heart_rate = EXCLUDED.heart_rate`;
  }

  return ok({ deleted: true });
};
