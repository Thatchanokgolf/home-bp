// Shared helpers for all functions.
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function ok(body) {
  return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(body) };
}
function bad(message, code = 400) {
  return { statusCode: code, headers: JSON_HEADERS, body: JSON.stringify({ error: message }) };
}
function parse(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return {};
  }
}

module.exports = { sql, ok, bad, parse };
