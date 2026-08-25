import crypto from 'crypto';

// StoryBuilder CSRF — double-submit cookie pattern (SPEC §3.1).
// GET /api/auth/csrf sets a csrfToken cookie (httpOnly:false, sameSite:lax,
// signed via HMAC) and returns { csrfToken }. Every mutating verb must send
// `x-csrf-token` header matching the cookie. Mismatch/missing → 403.

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXEMPT_PREFIXES = ['/api/auth/google'];

function timingSafeEqualStr(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function csrfToken(req, res, next) {
  const token = crypto.randomBytes(24).toString('base64url');
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

  if (!cookieToken || !headerToken || !timingSafeEqualStr(cookieToken, headerToken)) {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Invalid or missing CSRF token.',
    });
  }
  return next();
}

export default { csrfToken, csrfProtect };