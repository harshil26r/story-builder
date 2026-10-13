import crypto from 'crypto';

// StoryBuilder CSRF — signed double-submit cookie pattern (SPEC §3.1).
// GET /api/auth/csrf sets a csrfToken cookie (httpOnly:false, sameSite:lax) and
// returns { csrfToken }. Every mutating verb must send `x-csrf-token` matching
// the cookie. Mismatch/missing/unsigned/forged → 403.
//
// The token is `${nonce}.${hmac(nonce)}` signed with SESSION_SECRET. The raw
// double-submit pattern (cookie == header) is forgeable if an attacker can set
// a cookie on the victim's origin (subdomain/injection); the HMAC means only the
// server can mint a token, so an attacker-supplied pair can never validate.

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXEMPT_PREFIXES = ['/api/auth/google'];

function secret() {
  return process.env.SESSION_SECRET || 'dev-secret-change-me';
}

function hmacHex(value) {
  return crypto.createHmac('sha256', secret()).update(String(value)).digest('hex');
}

function timingSafeEqualStr(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function signNonce(nonce) {
  return `${nonce}.${hmacHex(nonce)}`;
}

function isSignedToken(token) {
  if (typeof token !== 'string') return false;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return false;
  const nonce = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  return timingSafeEqualStr(signature, hmacHex(nonce));
}

function issueToken() {
  return signNonce(crypto.randomBytes(24).toString('base64url'));
}

export function csrfToken(req, res, next) {
  const token = issueToken();
  res.cookie('csrfToken', token, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ csrfToken: token });
}

export function csrfProtect(req, res, next) {
  // Exempt pre-auth Google redirects.
  if (EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next();
  }

  if (!MUTATING.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies && req.cookies.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  if (
    !cookieToken ||
    !headerToken ||
    !timingSafeEqualStr(cookieToken, headerToken) ||
    !isSignedToken(cookieToken)
  ) {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Invalid or missing CSRF token.',
    });
  }
  return next();
}

export { issueToken as _signCsrfToken };
export default { csrfToken, csrfProtect };
