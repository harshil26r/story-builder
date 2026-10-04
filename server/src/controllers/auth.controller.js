import bcrypt from 'bcrypt';
import User from '../models/User.js';
import OtpToken from '../models/OtpToken.js';
import otpService from '../services/otpService.js';
import mailer from '../config/mailer.js';
import { verifyIdToken } from '../services/googleToken.js';
import { googleEnabled } from '../config/passport.js';
import { AppError } from '../utils/errors.js';

const normalizedEmail = (email) => String(email).toLowerCase().trim();

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
    const idEmail = normalizedEmail(email);

    const existing = await User.findOne({ email: idEmail });
    if (existing) {
      // Bugfix: an early build created *unverified* users at signup, dead-ending
      // them (EMAIL_EXISTS on retry with no way to finish verification). Such an
      // account can hold no session or owned data (login is gated on verified),
      // so it is safe to replace so the user can complete a clean signup.
      if (!existing.isEmailVerified) {
        await existing.deleteOne();
      } else {
        throw new AppError('EMAIL_EXISTS', 'An account with this email already exists.', 409);
      }
    }

    // Hash here (NOT via the User pre-save hook) so only the hash ever sits in
    // the pending OTP token. The User doc is only created after verification,
    // so an abandoned or unverified signup leaves nothing behind in the DB.
    const passwordHash = await bcrypt.hash(password, 12);

    await otpService.send(idEmail, 'signup-verify', {
      mailer,
      now: Date.now(),
      data: { name, passwordHash },
    });

    // No session yet — verification completes signup (TICKET-24 flow).
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

// Resend an OTP. For signup-verify, carries the pending registration payload
// (name + passwordHash) forward so the user can finish verifying after resend.
export async function sendOtp(req, res, next) {
  try {
    const { email, purpose } = req.body;
    const idEmail = normalizedEmail(email);

    let data;
    if (purpose === 'signup-verify') {
      const pending = await OtpToken.findOne({ email: idEmail, purpose: 'signup-verify' }).sort({
        createdAt: -1,
      });
      if (!pending?.data?.passwordHash) {
        throw new AppError(
          'NOT_FOUND',
          'No pending signup for this email. Please sign up first.',
          404,
        );
      }
      data = pending.data;
    }

    await otpService.send(idEmail, purpose, { mailer, now: Date.now(), data });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// Verifies the code, then (signup-verify) creates the User — the DB record is
// only created once the email is proven. Also issues the session.
export async function verifyOtp(req, res, next) {
  try {
    const { email, code, purpose } = req.body;
    const idEmail = normalizedEmail(email);

    // Read the pending payload BEFORE otpService.verify deletes the token on success.
    const pendingToken = await OtpToken.findOne({ email: idEmail, purpose }).sort({
      createdAt: -1,
    });
    const pending = pendingToken?.data;

    const ok = await otpService.verify(idEmail, code, purpose);
    if (!ok) {
      throw new AppError('OTP_INVALID', 'Incorrect code. Check your email and try again.', 400);
    }

    let user;
    if (purpose === 'signup-verify') {
      if (!pending?.name || !pending?.passwordHash) {
        throw new AppError('INVALID_STATE', 'This signup has expired. Please sign up again.', 400);
      }
      user = await User.create({
        name: pending.name,
        email: idEmail,
        passwordHash: null, // set below, already bcrypt-hashed — avoids re-hashing
        isEmailVerified: true,
      });
      // updateOne bypasses the pre-save hash hook so the stored hash is exact.
      await User.updateOne({ _id: user._id }, { $set: { passwordHash: pending.passwordHash } });
    } else {
      user = await User.findOne({ email: idEmail });
      if (!user) {
        throw new AppError('NOT_FOUND', 'No account found for this email.', 404);
      }
      user.isEmailVerified = true;
      await user.save();
    }

    await setSession(req, user);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// Always responds ok (anti-enumeration); OTP sent only when an account exists.
export async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body;
    const idEmail = normalizedEmail(email);

    const user = await User.findOne({ email: idEmail });
    if (user) {
      try {
        await otpService.send(idEmail, 'password-reset', { mailer, now: Date.now() });
      } catch (err) {
        // Cooldown/rate-limit — swallow: the user already has a live code.
        // eslint-disable-next-line no-console
        console.warn('[auth] password-reset OTP send throttled:', err.code || err.message);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, code, newPassword } = req.body;
    const idEmail = normalizedEmail(email);

    const ok = await otpService.verify(idEmail, code, 'password-reset');
    if (!ok) {
      throw new AppError('OTP_INVALID', 'Incorrect code. Check your email and try again.', 400);
    }

    const user = await User.findOne({ email: idEmail });
    if (!user) {
      throw new AppError('NOT_FOUND', 'No account found for this email.', 404);
    }

    user.passwordHash = newPassword; // pre-save hook bcrypt-hashes on save
    user.isEmailVerified = true;
    await user.save();

    await setSession(req, user);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

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
      throw new AppError(
        'ACCOUNT_ALREADY_LINKED',
        'This account is already linked to Google.',
        409,
      );
    }

    // The id_token's `sub` is the Google identity. If another local account
    // already claims it, the Google account can't be attached here (409 within
    // the sanctioned ACCOUNT_ALREADY_LINKED contract).
    const googleClaimed = await User.findOne({ googleId: idToken.sub });
    if (googleClaimed && String(googleClaimed._id) !== String(user._id)) {
      throw new AppError(
        'ACCOUNT_ALREADY_LINKED',
        'This Google account is already linked to another Story Builder account.',
        409,
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

export default {
  signup,
  login,
  logout,
  me,
  sendOtp,
  verifyOtp,
  requestPasswordReset,
  resetPassword,
  linkGoogle,
  googleEnabled,
};
