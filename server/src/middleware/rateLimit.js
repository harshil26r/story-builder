import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { AppError } from '../utils/errors.js';

// StoryBuilder rate limits (SPEC §7.2).
// Global 100 req/min/IP · Auth 10 req/min/IP · AI 15 calls/15min/user.

const windowMs = (min) => min * 60 * 1000;

const standardHeaders = true;
const legacyHeaders = false;

// Kill-switch: when false, all limiters pass through (used by tests to avoid
// shared-singleton exhaustion across test files).
let _enabled = true;
export function setRateLimitsEnabled(val) {
  _enabled = Boolean(val);
}
function skipIfDisabled() {
  return !_enabled;
}

export const globalLimiter = rateLimit({
  windowMs: windowMs(1),
  max: 100,
  standardHeaders,
  legacyHeaders,
  skip: skipIfDisabled,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    const retryAfterSec = Math.ceil(
      req.rateLimit.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 60,
    );
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
  keyGenerator: (req) =>
    `email:${(req.body && req.body.email ? req.body.email : req.ip).toLowerCase()}`,
  handler: (req, res) => {
    res.setHeader('Retry-After', String(15 * 60));
    res.status(429).json({
      code: 'RATE_LIMITED',
      message: 'Too many OTP requests for this email. Try again in 15 minutes.',
      retryAfterSec: 15 * 60,
    });
  },
});

// AI cost guard (SPEC §7.3, ACR-B-16). DB-backed per-user limiter that weights
// units (1 for generate, 1 + chapters for regenerate via `req.body.units`),
// prunes `aiUsage.calls[]` to the window, rolls the day token budget at UTC
// midnight, and reserves the call slot before the stream starts. This replaces
// the flat `aiLimiter` on AI routes so regenerates cost their true weight.
const AI_WINDOW_MS = (Number(process.env.AI_RATE_LIMIT_WINDOW_MIN) || 15) * 60 * 1000;
const AI_MAX_CALLS = Number(process.env.AI_RATE_LIMIT_CALLS) || 15;
const AI_DAILY_BUDGET = Number(process.env.AI_DAILY_TOKEN_BUDGET) || 1_000_000;

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function aiCostGuard(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) throw new AppError('UNAUTHORIZED', 'Sign in required.', 401);

    const units = Math.max(1, Number(req.body && req.body.units) || 1);
    const user = await User.findById(userId).select('aiUsage');
    if (!user) throw new AppError('UNAUTHORIZED', 'Sign in required.', 401);

    if (!user.aiUsage) {
      user.aiUsage = { calls: [], dayTokens: 0, dayKey: '', dayBudgetExceededAt: null };
    }

    const dk = utcDayKey();
    if (user.aiUsage.dayKey !== dk) {
      user.aiUsage.dayKey = dk;
      user.aiUsage.dayTokens = 0;
      user.aiUsage.dayBudgetExceededAt = null;
    }

    if (user.aiUsage.dayBudgetExceededAt && user.aiUsage.dayTokens > AI_DAILY_BUDGET) {
      return res.status(429).json({
        code: 'DAY_BUDGET_EXCEEDED',
        message: 'Daily AI budget reached — resumes at midnight UTC.',
      });
    }

    const cutoff = new Date(Date.now() - AI_WINDOW_MS);
    const active = user.aiUsage.calls.filter((c) => c.at >= cutoff);
    const usedUnits = active.reduce((sum, c) => sum + (c.units || 1), 0);

    if (usedUnits + units > AI_MAX_CALLS) {
      res.setHeader('Retry-After', String(Math.ceil(AI_WINDOW_MS / 1000)));
      return res.status(429).json({
        code: 'RATE_LIMITED',
        message: 'AI generation rate limit reached. Try again in a few minutes.',
        retryAfterSec: Math.ceil(AI_WINDOW_MS / 1000),
      });
    }

    active.push({
      at: new Date(),
      units,
      storyId: (req.body && req.body.storyId) || null,
    });
    user.aiUsage.calls = active;
    await user.save({ validateModifiedOnly: true });

    return next();
  } catch (err) {
    return next(err);
  }
}

// Best-effort token accounting, called by the AI service at stream completion.
export async function recordAiUsage(userId, tokens) {
  if (!userId || !Number.isFinite(Number(tokens)) || Number(tokens) <= 0) return;
  try {
    await User.updateOne(
      { _id: userId },
      { $inc: { 'aiUsage.dayTokens': Math.ceil(Number(tokens)) } },
    );
  } catch {
    // Best effort — never break the stream over accounting.
  }
}

export default {
  globalLimiter,
  authLimiter,
  aiLimiter,
  sendOtpLimiter,
  aiCostGuard,
  recordAiUsage,
};
