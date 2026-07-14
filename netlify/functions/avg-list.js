const { sql, ok, bad, parse } = require('./_db');
const { verify, canViewUser } = require('./_auth');

// POST /api/avg-list  body: { user_id, from, to }
// Returns the averaged rows plus a summary block.
// Allowed for the owner, or an admin viewing a shared user.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);

  const { user_id, from, to } = parse(event);
  if (!user_id) return bad('Missing user');
  if (!(await canViewUser(auth, user_id, sql))) return bad('Forbidden', 403);

  const rows = await sql`
    SELECT id, date, ampm, systolic, diastolic, heart_rate
    FROM avg_bp
    WHERE user_id = ${user_id}
      AND date BETWEEN ${from} AND ${to}
    ORDER BY date, ampm`;

  const num = (x) => (x == null ? null : Number(x));
  const avg = (arr, key) =>
    arr.length ? arr.reduce((a, r) => a + Number(r[key]), 0) / arr.length : null;

  const amRows = rows.filter((r) => r.ampm === 'AM');
  const pmRows = rows.filter((r) => r.ampm === 'PM');
  const days = new Set(rows.map((r) => String(r.date))).size;

  const summary = {
    am: { systolic: num(avg(amRows, 'systolic')), diastolic: num(avg(amRows, 'diastolic')), heart_rate: num(avg(amRows, 'heart_rate')) },
    pm: { systolic: num(avg(pmRows, 'systolic')), diastolic: num(avg(pmRows, 'diastolic')), heart_rate: num(avg(pmRows, 'heart_rate')) },
    all: { systolic: num(avg(rows, 'systolic')), diastolic: num(avg(rows, 'diastolic')), heart_rate: num(avg(rows, 'heart_rate')) },
    count: rows.length,
    max_expected: days * 2,
    days,
  };

  return ok({ rows, summary });
};
