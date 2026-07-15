const bcrypt = require('bcryptjs');
const { sql, ok, bad, parse } = require('./_db');

const HOSPITALS = ['Siriraj Hospital', 'Srinagarind Hospital'];

// POST /api/register
// body: { email, hospital?, hospital_id?, username?, first_name?, last_name?,
//         password, password2, shared }
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const b = parse(event);
  // Case is preserved for display; matching/uniqueness is case-insensitive (LOWER()).
  const email = (b.email || '').trim();
  const hospital = (b.hospital || '').trim();
  const hospital_id = (b.hospital_id || '').trim();
  const username = (b.username || '').trim();
  const first_name = (b.first_name || '').trim();
  const last_name = (b.last_name || '').trim();
  const password = b.password || '';
  const password2 = b.password2 || '';
  const shared = b.shared === true || b.shared === 'yes';

  // E-mail is optional; validate format only if one was provided.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Invalid e-mail format');

  // Password: >= 8 chars, must contain letters AND numbers
  if (!password || !password2) return bad('Password is required');
  if (password !== password2) return bad('Passwords do not match');
  if (password.length < 8) return bad('Password must be at least 8 characters');
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
    return bad('Password must contain both letters and numbers');

  // Hospital
  if (hospital && !HOSPITALS.includes(hospital)) return bad('Invalid hospital');

  // Hospital ID: only if a hospital is chosen, and at least 4 characters
  if (hospital_id) {
    if (!hospital) return bad('Select a hospital before entering a Hospital ID');
    if (hospital_id.length < 4) return bad('Hospital ID must be at least 4 characters');
  }

  // Username: must contain a letter, must not contain '@'
  if (username) {
    if (username.includes('@')) return bad('Username cannot contain "@"');
    if (!/[A-Za-z]/.test(username)) return bad('Username must contain at least one letter');
  }

  // Duplicate checks (case-insensitive, specific messages)
  if (email && (await sql`SELECT 1 FROM users WHERE LOWER(email) = LOWER(${email})`).length)
    return bad('An account with this e-mail already exists');
  if (hospital_id && (await sql`SELECT 1 FROM users WHERE hospital_id = ${hospital_id}`).length)
    return bad('An account with this Hospital ID already exists');
  if (username && (await sql`SELECT 1 FROM users WHERE LOWER(username) = LOWER(${username})`).length)
    return bad('This username is already taken');

  const hash = await bcrypt.hash(password, 10);
  const rows = await sql`
    INSERT INTO users (email, hospital, hospital_id, username, first_name, last_name, role, password, shared)
    VALUES (${email || null}, ${hospital || null}, ${hospital_id || null}, ${username || null},
            ${first_name || null}, ${last_name || null}, 'user', ${hash}, ${shared})
    RETURNING id, email, hospital, hospital_id, username, first_name, last_name, role, shared`;
  let user = rows[0];

  // No username given -> auto-assign "user<id>" (id is known only after insert).
  if (!user.username) {
    try {
      const upd = await sql`
        UPDATE users SET username = ${'user' + user.id} WHERE id = ${user.id}
        RETURNING id, email, hospital, hospital_id, username, first_name, last_name, role, shared`;
      user = upd[0];
    } catch (e) {
      // Extremely unlikely name clash: leave username null rather than fail registration.
    }
  }

  return ok({ user });
};
