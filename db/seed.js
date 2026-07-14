// Creates one admin account. Run: npm run db:seed
// Default admin login -> id: (printed), email: admin@home-bp.local, password: admin123
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
require('dotenv').config();

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);
  const email = 'admin@home-bp.local';
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length) {
    console.log(`Admin already exists (id=${existing[0].id}). Skipping.`);
    return;
  }
  const hash = await bcrypt.hash('admin123', 10);
  const rows = await sql`
    INSERT INTO users (email, role, password, shared)
    VALUES (${email}, 'admin', ${hash}, false)
    RETURNING id`;
  console.log(`Admin created. Login with id=${rows[0].id} or email=${email}, password=admin123`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
