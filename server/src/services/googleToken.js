import crypto from 'crypto';
import { AppError } from '../utils/errors.js';

// StoryBuilder Google id_token verification (SPEC §5.2, ACR-B-07).
//
// `verifyIdToken(token, { clientID, certsUrl })` validates a Google-signed
// RS256 JWT: structurally parse → JWKS fetch (per-kid cache) → crypto verify →
// audience/issuer/exp checks. Returns { sub, email, email_verified }.
//
// Uses Node's built-in crypto JWK support — no external dependency. The JWKS
// endpoint is overridable (GOOGLE_CERTS_URL) so tests can point at a local
// certs server; defaults to Google's well-known endpoint.
//
// Error codes: a malformed/unsigned/garbage token surfaces VALIDATION_ERROR (400
// — the sanctioned 400 code per SPEC §7.4) with a descriptive message, and
// NOT_CONFIGURED (501) when OAuth is not configured.

const GOOGLE_CERTS_DEFAULT = 'https://www.googleapis.com/oauth2/v3/certs';
const MAX_JWKS_AGE_MS = 15 * 60 * 1000; // 15-min cert cache
const CLOCK_SKEW_S = 5 * 60;

// Cache keyed by certsUrl so a single process serving different endpoints (tests
// vs prod) never serves stale keys from a previous URL.
let jwksCache = {}; // { [certsUrl]: { fetchedAt, keys } }

function b64urlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

function parseJwtParts(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  let header;
  let payload;
  try {
    header = JSON.parse(b64urlDecode(parts[0]));
    payload = JSON.parse(b64urlDecode(parts[1]));
  } catch {
    return null;
  }
  return { header, payload, signature: parts[2] };
}

async function fetchJwks(certsUrl, now = Date.now()) {
  const cached = jwksCache[certsUrl];
  if (cached && now - cached.fetchedAt < MAX_JWKS_AGE_MS) {
    return cached.keys;
  }
  const res = await fetch(certsUrl);
  if (!res.ok) {
    throw new AppError('INTERNAL_ERROR', 'Failed to load Google signing keys.', 500);
  }
  const data = await res.json();
  const keys = Array.isArray(data.keys) ? data.keys : [];
  jwksCache[certsUrl] = { fetchedAt: now, keys };
  return keys;
}

function importJwkKey(jwk) {
  try {
    return crypto.createPublicKey({ key: jwk, format: 'jwk' });
  } catch {
    return null;
  }
}

export function resetTokenCache() {
  jwksCache = {};
}

export async function verifyIdToken(token, { clientID, certsUrl, now } = {}) {
  if (!clientID) {
    throw new AppError('NOT_CONFIGURED', 'Google auth not configured in this deployment.', 501);
  }
  const parsed = parseJwtParts(token);
  if (!parsed) {
    throw new AppError('VALIDATION_ERROR', 'Malformed Google id_token.', 400);
  }
  const { header, payload, signature } = parsed;
  if (header.alg !== 'RS256' || !header.kid || !payload) {
    throw new AppError('VALIDATION_ERROR', 'Unsupported Google id_token.', 400);
  }

  const keys = await fetchJwks(certsUrl || GOOGLE_CERTS_DEFAULT, now || Date.now());
  const jwk = keys.find((k) => k.kid === header.kid && k.alg === 'RS256');
  const publicKey = jwk ? importJwkKey(jwk) : null;
  if (!publicKey) {
    throw new AppError('VALIDATION_ERROR', 'Unknown Google signing key.', 400);
  }

  const signingInput = token.split('.').slice(0, 2).join('.');
  const valid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(signingInput),
    publicKey,
    Buffer.from(signature, 'base64url'),
  );
  if (!valid) {
    throw new AppError('VALIDATION_ERROR', 'Google id_token signature invalid.', 400);
  }

  const ts = Math.floor((now || Date.now()) / 1000);
  if (payload.aud !== clientID) {
    throw new AppError('VALIDATION_ERROR', 'Google id_token audience mismatch.', 400);
  }
  // Google emits `iss` as EITHER 'accounts.google.com' OR 'https://accounts.google.com'.
  const iss = payload.iss ? String(payload.iss).replace(/^https:\/\//, '') : null;
  if (iss && iss !== 'accounts.google.com') {
    throw new AppError('VALIDATION_ERROR', 'Google id_token issuer mismatch.', 400);
  }
  if (payload.exp && payload.exp + CLOCK_SKEW_S < ts) {
    throw new AppError('VALIDATION_ERROR', 'Google id_token has expired.', 400);
  }

  return {
    sub: String(payload.sub),
    email: payload.email ? String(payload.email).toLowerCase() : null,
    emailVerified: Boolean(payload.email_verified),
  };
}

export default { verifyIdToken, resetTokenCache };
