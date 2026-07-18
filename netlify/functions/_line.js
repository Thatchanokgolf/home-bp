// Verifies a LINE token (from LIFF) with LINE's server and returns the
// authenticated LINE profile. The channel id is the numeric prefix of the LIFF id.
const CHANNEL_ID = process.env.LINE_CHANNEL_ID || '2010745308';

// Verify a LINE ID token. NOTE: LIFF does not refresh ID tokens, so a cached
// one from a returning session is frequently expired ("IdToken expired").
// Prefer verifyLineAccessToken below, which LIFF keeps fresh.
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

// Verify a LINE access token. LIFF auto-refreshes access tokens, so this avoids
// the ID-token-expiry problem entirely. Two steps: (1) confirm the token belongs
// to our channel and is not expired, (2) fetch the profile for the stable userId.
async function verifyLineAccessToken(accessToken) {
  const vr = await fetch(
    'https://api.line.me/oauth2/v2.1/verify?access_token=' + encodeURIComponent(accessToken)
  );
  const v = await vr.json().catch(() => ({}));
  if (!vr.ok || v.error) {
    throw new Error(v.error_description || v.error || 'LINE verification failed');
  }
  // Guard against tokens issued for a different channel.
  if (String(v.client_id) !== String(CHANNEL_ID)) throw new Error('Token audience mismatch');
  if (Number(v.expires_in) <= 0) throw new Error('LINE token expired');

  const pr = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  const p = await pr.json().catch(() => ({}));
  if (!pr.ok || !p.userId) throw new Error('Failed to fetch LINE profile');
  // p.userId is the same stable id as `sub` in the ID token.
  return { sub: p.userId, name: p.displayName || '', email: null };
}

// Convenience: accept whichever token the client sent, preferring the access token.
async function verifyLineCredential({ access_token, id_token }) {
  if (access_token) return verifyLineAccessToken(access_token);
  if (id_token) return verifyLineToken(id_token);
  throw new Error('Missing LINE token');
}

module.exports = { verifyLineToken, verifyLineAccessToken, verifyLineCredential, CHANNEL_ID };
