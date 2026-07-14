// Applies db/schema.sql to the Neon database in DATABASE_URL.
// Run: npm run db:setup
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);
  const text = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = text
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--'));

  for (const stmt of statements) {
    await sql.query(stmt);
  }
  console.log(`Schema applied (${statements.length} statements).`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
