import rateLimit from 'express-rate-limit';

// StoryBuilder rate limits (SPEC §7.2).
// Global 100 req/min/IP · Auth 10 req/min/IP · AI 15 calls/15min/user.

const windowMs = (min) => min * 60 * 1000;

const standardHeaders = true;
const legacyHeaders = false;

// Kill-switch: when false, all limiters pass through (used by tests to avoid
// shared-singleton exhaustion across test files).
let _enabled = true;
export function setRateLimitsEnabled(val) { _enabled = Boolean(val); }
function skipIfDisabled() { return !_enabled; }

export const globalLimiter = rateLimit({
  windowMs: windowMs(1),
  max: 100,
  standardHeaders,
  legacyHeaders,
  skip: skipIfDisabled,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    const retryAfterSec = Math.ceil(req.rateLimit.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 60);
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      code: 'RATE_LIMITED',
      message: 'Too many requests, please slow down.',
      retryAfterSec,
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: windowMs(1),
  max: 10,
  standardHeaders,
  legacyHeaders,
  skip: skipIfDisabled,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.setHeader('Retry-After', '60');
    res.status(429).json({
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Try again in a minute.',
      retryAfterSec: 60,
    });
  },
});

// AI generation — per-user, 15 calls / 15 min (SPEC §7.3). Units handled by the
// AI service (regenerate counts 1 + N chapters) via the cost-guard middleware.
export const aiLimiter = rateLimit({
  windowMs: windowMs(Number(process.env.AI_RATE_LIMIT_WINDOW_MIN) || 15),
  max: Number(process.env.AI_RATE_LIMIT_CALLS) || 15,
  standardHeaders,
  legacyHeaders,
  skip: skipIfDisabled,
  keyGenerator: (req) => {
    const uid = (req.session && req.session.userId) || req.ip;
    return `u:${uid}`;
  },
  handler: (req, res) => {
    res.setHeader('Retry-After', String(Math.ceil(15 * 60)));
    res.status(429).json({
      code: 'RATE_LIMITED',
      message: 'AI generation rate limit reached. Try again in 15 minutes.',
      retryAfterSec: 15 * 60,
    });
  },
});

// OTP send: 5 / 15 min / email + 60s resend cooldown (driven by otpService, not
// express-rate-limit, because the key is the email and it needs DB state).
export const sendOtpLimiter = rateLimit({
  windowMs: windowMs(15),
  max: 5,
  standardHeaders,
  legacyHeaders,
  keyGenerator: (req) => `email:${(req.body && req.body.email ? req.body.email : req.ip).toLowerCase()}`,
  handler: (req, res) => {
    res.setHeader('Retry-After', String(15 * 60));
    res.status(429).json({
      code: 'RATE_LIMITED',
      message: 'Too many OTP requests for this email. Try again in 15 minutes.',
      retryAfterSec: 15 * 60,
    });
  },
});

export default { globalLimiter, authLimiter, aiLimiter, sendOtpLimiter };