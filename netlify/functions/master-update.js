const { sql, ok, bad, parse } = require('./_db');
const { verify } = require('./_auth');

const HOSPITALS = ['Siriraj Hospital', 'Srinagarind Hospital'];
const ROLES = ['user', 'admin', 'master'];

// POST /api/master-update  body: { id, email, hospital, hospital_id, username,
//   first_name, last_name, role, shared }
// Master only. Updates any user's data + role (never the password).
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const auth = verify(event);
  if (!auth) return bad('Unauthorized', 401);
  if (auth.role !== 'master') return bad('Forbidden', 403);

  const b = parse(event);
  const id = Number(b.id);
  if (!id) return bad('Missing user id');

  const role = b.role || 'user';
  if (!ROLES.includes(role)) return bad('Invalid role');
  const hospital = (b.hospital || '').trim();
  if (hospital && !HOSPITALS.includes(hospital)) return bad('Invalid hospital');

  const email = (b.email || '').trim() || null;
  const hospital_id = (b.hospital_id || '').trim() || null;
  const username = (b.username || '').trim() || null;
  const first_name = (b.first_name || '').trim() || null;
  const last_name = (b.last_name || '').trim() || null;
  const shared = b.shared === true || b.shared === 'yes';

  try {
    const rows = await sql`
      UPDATE users SET
        email = ${email}, hospital = ${hospital || null}, hospital_id = ${hospital_id},
        username = ${username}, first_name = ${first_name}, last_name = ${last_name},
        role = ${role}, shared = ${shared}
      WHERE id = ${id}
      RETURNING id, email, hospital, hospital_id, username, first_name, last_name, role, shared`;
    if (!rows.length) return bad('User not found', 404);
    return ok({ user: rows[0] });
  } catch (e) {
    if (/unique|duplicate/i.test(e.message))
      return bad('E-mail, Hospital ID or Username is already in use by another account');
    return bad(e.message, 500);
  }
};
