import crypto from 'crypto';
import OtpToken from '../models/OtpToken.js';
import { AppError } from '../utils/errors.js';

// StoryBuilder OTP service (SPEC §5.2, ACR-B-06).
// Real sha256-hashed 6-digit codes, 10-min TTL, max 3 verify attempts,
// resend cooldown 60s, send limit 5/15min/email.

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_MS = 60 * 1000; // 60 seconds
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_SENDS = 5;
const MAX_ATTEMPTS = 3;

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function nowOf(now) {
  return now || Date.now();
}

async function send(email, purpose, opts = {}) {
  const now = nowOf(opts.now);
  const mailer = opts.mailer || null;
  const normalizedEmail = String(email).toLowerCase().trim();

  // 60s resend cooldown per email+purpose (measured against the LATEST token).
  const live = await OtpToken.findOne({ email: normalizedEmail, purpose }).sort({ createdAt: -1 });
  if (live) {
    const age = now - new Date(live.createdAt).getTime();
    if (age < COOLDOWN_MS) {
      throw new AppError(
        'RATE_LIMITED',
        'Please wait 60 seconds before requesting another code.',
        429,
      );
    }
  }

  // 5 sends / 15 min / email — count tokens created in the window; if 5 already
  // exist (i.e. the 5 real sends have happened), reject the 6th. Old tokens are
  // TTL-cleaned, so this count reflects genuine send volume.
  const since = new Date(now - WINDOW_MS);
  const sentCount = await OtpToken.countDocuments({
    email: normalizedEmail,
    createdAt: { $gte: since },
  });
  if (sentCount >= MAX_SENDS) {
    throw new AppError(
      'RATE_LIMITED',
      'Too many OTP requests for this email. Try again in 15 minutes.',
      429,
    );
  }

  // Generate 6-digit code + store only its sha256 hash. CSPRNG (crypto.randomInt)
  // — never Math.random(), which is predictable.
  const code = String(crypto.randomInt(100000, 1000000));
  const otpCodeHash = sha256Hex(code);
  const expiresAt = new Date(now + TTL_MS);

  // Use `now` for createdAt so the cooldown math is deterministic in tests.
  await OtpToken.create({
    email: normalizedEmail,
    otpCodeHash,
    purpose,
    expiresAt,
    createdAt: new Date(now),
    attempts: 0,
    ...(opts.data !== undefined ? { data: opts.data } : {}),
  });

  if (mailer && typeof mailer.sendMail === 'function') {
    await mailer.sendMail({
      to: normalizedEmail,
      subject: 'Your Story Builder verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });
  }

  return { ok: true, code };
}

async function verify(email, code, purpose) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const token = await OtpToken.findOne({ email: normalizedEmail, purpose }).sort({ createdAt: -1 });

  if (!token) {
    throw new AppError('OTP_EXPIRED', 'This code is invalid or has expired.', 410);
  }

  if (new Date(token.expiresAt).getTime() < Date.now()) {
    await token.deleteOne();
    throw new AppError('OTP_EXPIRED', 'This code has expired.', 410);
  }

  if (token.attempts >= MAX_ATTEMPTS) {
    await token.deleteOne();
    throw new AppError(
      'OTP_TOO_MANY_ATTEMPTS',
      'Too many incorrect attempts. Request a new code.',
      429,
    );
  }

  const ok = crypto.timingSafeEqual(
    Buffer.from(token.otpCodeHash, 'hex'),
    Buffer.from(sha256Hex(code), 'hex'),
  );

  if (ok) {
    await token.deleteOne();
    return true;
  }

  token.attempts += 1;
  await token.save();

  if (token.attempts >= MAX_ATTEMPTS) {
    await token.deleteOne();
    throw new AppError(
      'OTP_TOO_MANY_ATTEMPTS',
      'Too many incorrect attempts. Request a new code.',
      429,
    );
  }

  return false;
}

export default { send, verify };
