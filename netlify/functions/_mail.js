const nodemailer = require('nodemailer');

// True when SMTP_* env vars are configured.
function smtpReady() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Sends a plain-text e-mail. Returns { sent: boolean }. Never throws to callers
// that wrap it — registration/forgot-password should not fail if mail is down.
async function sendMail({ to, subject, text }) {
  if (!smtpReady()) return { sent: false, reason: 'SMTP not configured' };
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Home BP <no-reply@home-bp.local>',
    to,
    subject,
    text,
  });
  return { sent: true };
}

module.exports = { smtpReady, sendMail };
