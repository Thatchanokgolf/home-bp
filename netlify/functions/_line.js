// Verifies a LINE ID token (from LIFF) with LINE's server and returns the
// authenticated LINE profile. The channel id is the numeric prefix of the LIFF id.
const CHANNEL_ID = process.env.LINE_CHANNEL_ID || '2010745308';

async function verifyLineToken(idToken) {
  const body = new URLSearchParams({ id_token: idToken, client_id: CHANNEL_ID });
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || 'LINE verification failed');
  }
  if (String(data.aud) !== String(CHANNEL_ID)) throw new Error('Token audience mismatch');
  // data: { iss, sub, aud, exp, iat, name, picture, email? }
  return { sub: data.sub, name: data.name || '', email: data.email || null };
}

module.exports = { verifyLineToken, CHANNEL_ID };
