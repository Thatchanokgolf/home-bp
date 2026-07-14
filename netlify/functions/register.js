const bcrypt = require('bcryptjs');
const { sql, ok, bad, parse } = require('./_db');

// POST /api/register
// body: { email?, hospital?, hospital_id?, password, password2, shared }
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const { email, hospital, hospital_id, password, password2, shared } = parse(event);

  if (!password || !password2) return bad('Password is required');
  if (password !== password2) return bad('Passwords do not match');
  if (email) {
    const dup = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (dup.length) return bad('This e-mail is already registered');
  }

  const hash = await bcrypt.hash(password, 10);
  const rows = await sql`
    INSERT INTO users (email, hospital, hospital_id, role, password, shared)
    VALUES (${email || null}, ${hospital || null}, ${hospital_id || null},
            'user', ${hash}, ${shared === true || shared === 'yes'})
    RETURNING id, email, hospital, hospital_id, role, shared`;

  return ok({ user: rows[0] });
};
