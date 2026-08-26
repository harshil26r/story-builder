import User from '../models/User.js';
import otpService from '../services/otpService.js';
import { verifyIdToken } from '../services/googleToken.js';
import { googleEnabled } from '../config/passport.js';
import { AppError, errorResponse } from '../utils/errors.js';

async function setSession(req, user) {
  req.session.userId = user._id.toString();
  // Persist the session (the authGuard reads req.session.userId on later requests).
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('EMAIL_EXISTS', 'An account with this email already exists.', 409);
    }

    const user = await User.create({
      name,
      email,
      passwordHash: password,
      isEmailVerified: false,
    });

    // Phase 1: OTP send is a no-op; Phase 2 sends real code. Fire it but NEVER
    // let OTP delivery failure (rate-limit cooldown, mailer down) block signup —
    // the account is created and usable; verification becomes possible once the
    // OTP path is fully implemented (TICKET-24).
    try {
      await otpService.send(email, 'signup-verify', { mailer: null, now: Date.now() });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[auth] signup ok, but OTP send failed (non-fatal):', err.code || err.message);
    }

    // User is created but NOT logged in until verified (Phase 2 gate).
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
    }
    if (!user.isEmailVerified) {
      throw new AppError('EMAIL_NOT_VERIFIED', 'Verify your email before logging in.', 403);
    }
    await setSession(req, user);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    // Belongs in auth.routes as GET (no authGuard but optionalAuth), so req.user may be null.
    // ACR-F-05: server advertises google availability so the client can hide/disable
    // the Google button when OAuth is not configured.
    res.json({ user: req.user || null, googleEnabled });
  } catch (err) {
    next(err);
  }
}

// Placeholders — fully implemented in Phase 2/3 (OTP/reset are Phase 2; google
// routes handled in auth.routes via passport).
export const sendOtp = (req, res) => res.json({ ok: true });
export const verifyOtp = (req, res) => res.json({ ok: true });
export const requestPasswordReset = (req, res) => res.json({ ok: true });
export const resetPassword = (req, res) => res.json({ ok: true });

// POST /api/auth/link-google (AUTH + csrf + validated id_token).
// Attaches googleId to the authenticated account. NEVER clobbers an existing
// passwordHash (dual-auth, SPEC §5.1). Already linked → 409 ACCOUNT_ALREADY_LINKED.
export async function linkGoogle(req, res, next) {
  try {
    const { googleAccessToken } = req.body;
    if (!googleEnabled) {
      throw new AppError('NOT_CONFIGURED', 'Google auth not configured in this deployment.', 501);
    }

    const idToken = await verifyIdToken(googleAccessToken, {
      clientID: process.env.GOOGLE_CLIENT_ID,
      certsUrl: process.env.GOOGLE_CERTS_URL,
    });

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'User not found.', 401);
    }

    // Duplicate link: this account is already connected to a Google identity.
    if (user.googleId) {
      throw new AppError('ACCOUNT_ALREADY_LINKED', 'This account is already linked to Google.', 409);
    }

    // The id_token's `sub` is the Google identity. If another local account
    // already claims it, the Google account can't be attached here (409 within
    // the sanctioned ACCOUNT_ALREADY_LINKED contract).
    const googleClaimed = await User.findOne({ googleId: idToken.sub });
    if (googleClaimed && String(googleClaimed._id) !== String(user._id)) {
      throw new AppError(
        'ACCOUNT_ALREADY_LINKED',
        'This Google account is already linked to another Story Builder account.',
        409
      );
    }

    // Attach googleId. passwordHash (if present) is left untouched — dual-auth
    // (SPEC §5.1). We do NOT flip isEmailVerified here: linking an account does
    // not itself verify the user, and email verification is a separate gate.
    user.googleId = idToken.sub;
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export default { signup, login, logout, me, sendOtp, verifyOtp, requestPasswordReset, resetPassword, linkGoogle, googleEnabled };