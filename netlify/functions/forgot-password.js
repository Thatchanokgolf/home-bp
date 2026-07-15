const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { sql, ok, bad, parse } = require('./_db');

function newPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

// POST /api/forgot-password  body: { email }
// Only works if the account has an e-mail on file.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);
  const { email } = parse(event);
  if (!email) return bad('Please enter the e-mail you registered with');

  const rows = await sql`SELECT id, email FROM users WHERE LOWER(email) = LOWER(${email})`;
  if (!rows.length) return bad('No account with an e-mail matches that address', 404);

  const pass = newPassword();
  const hash = await bcrypt.hash(pass, 10);
  await sql`UPDATE users SET password = ${hash} WHERE id = ${rows[0].id}`;

  const smtpReady = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (smtpReady) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'Home BP <no-reply@home-bp.local>',
        to: email,
        subject: 'Home BP — your new password',
        text: `Your new password is: ${pass}\nPlease log in and change it if you wish.`,
      });
      return ok({ sent: true });
    } catch (e) {
      return bad('Could not send e-mail: ' + e.message, 502);
    }
  }

  // No SMTP configured (e.g. local dev): return the password so testing still works.
  return ok({ sent: false, password: pass });
};
