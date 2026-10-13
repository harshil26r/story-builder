// StoryBuilder CORS (SPEC §7.2). Dev uses the Vite proxy (same-origin) so no
// CORS is needed there; production/split-origin deployments set CORS_ORIGIN to a
// comma-separated allowlist (or `*`). Credentials are allowed so the session
// cookie and CSRF cookie flow through preflight requests.

const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

function allowedOrigins() {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || !raw.trim()) return DEV_ORIGINS;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function cors(req, res, next) {
  const origin = req.headers.origin;
  const allowed = allowedOrigins();
  if (origin && (allowed.includes('*') || allowed.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-csrf-token');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return next();
}
