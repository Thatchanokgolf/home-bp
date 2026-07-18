const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sql, ok, bad, parse } = require('./_db');
const { sendMail } = require('./_mail');
const { verifyLineCredential } = require('./_line');
const { signToken } = require('./_auth');

const HOSPITALS = ['Siriraj Hospital', 'Srinagarind Hospital'];

// Random 20-letter code for QR login. Only its bcrypt hash is stored.
function genCode(n = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += chars[bytes[i] % chars.length];
  return s;
}

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

  // Username: must contain a letter, must not contain '@',
  // and must not start with 'user' (reserved for auto-generated usernames).
  if (username) {
    if (username.includes('@')) return bad('Username cannot contain "@"');
    if (!/[A-Za-z]/.test(username)) return bad('Username must contain at least one letter');
    if (/^user/i.test(username)) return bad("Username cannot begin with 'user' (reserved)");
  }

  // Duplicate checks (case-insensitive, specific messages)
  if (email && (await sql`SELECT 1 FROM users WHERE LOWER(email) = LOWER(${email})`).length)
    return bad('An account with this e-mail already exists');
  if (hospital_id && (await sql`SELECT 1 FROM users WHERE hospital_id = ${hospital_id}`).length)
    return bad('An account with this Hospital ID already exists');
  if (username && (await sql`SELECT 1 FROM users WHERE LOWER(username) = LOWER(${username})`).length)
    return bad('This username is already taken');

  // Optional: link a LINE account (verify the LIFF token, ensure it's unused).
  let lineSub = null;
  if (b.line_access_token || b.line_id_token) {
    try {
      const line = await verifyLineCredential({
        access_token: b.line_access_token,
        id_token: b.line_id_token,
      });
      lineSub = line.sub;
    } catch (e) {
      return bad('LINE verification failed: ' + e.message, 400);
    }
    if ((await sql`SELECT 1 FROM users WHERE line_user_id = ${lineSub}`).length)
      return bad('This LINE account is already linked to another account', 409);
  }

  const hash = await bcrypt.hash(password, 10);
  const qrCode = genCode(20);
  const qrHash = await bcrypt.hash(qrCode, 10);
  const rows = await sql`
    INSERT INTO users (email, hospital, hospital_id, username, first_name, last_name, role, password, shared, hash_password, line_user_id)
    VALUES (${email || null}, ${hospital || null}, ${hospital_id || null}, ${username || null},
            ${first_name || null}, ${last_name || null}, 'user', ${hash}, ${shared}, ${qrHash}, ${lineSub})
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

  // Optional confirmation e-mail (only if an e-mail was given and SMTP is set up).
  let email_sent = false;
  if (email) {
    const origin = String(b.origin || '').replace(/\/+$/, '');
    const qrUrl = origin
      ? `${origin}/qr-login.html?uid=${user.id}&code=${encodeURIComponent(qrCode)}`
      : '';
    const lines = [
      'Home Blood Pressure — Registration confirmation',
      '',
      `ID: ${user.id}`,
      `Username: ${user.username}`,
      user.hospital ? `Hospital: ${user.hospital}` : null,
      user.hospital_id ? `HN: ${user.hospital_id}` : null,
      `Password: ${password}`,
      qrUrl ? '' : null,
      qrUrl ? `Log in with your QR link: ${qrUrl}` : null,
      '',
      'Please keep this e-mail for your records.',
    ].filter((l) => l !== null);
    try {
      const r = await sendMail({
        to: email,
        subject: 'Home BP — Registration confirmation',
        text: lines.join('\n'),
      });
      email_sent = r.sent;
    } catch (e) {
      email_sent = false; // never fail registration because of e-mail
    }
  }

  // qr_code (plaintext, shown once) lets the client render the QR login code.
  // token lets the completion screen link a LINE account / continue logged in.
  return ok({ user, qr_code: qrCode, email_sent, token: signToken(user) });
};
