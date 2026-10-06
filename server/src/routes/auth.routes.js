import { Router } from 'express';
import passport, { googleEnabled } from '../config/passport.js';
import authController from '../controllers/auth.controller.js';
import { authGuard, optionalAuth } from '../middleware/authGuard.js';
import { validate } from '../middleware/validate.js';
import { csrfToken, csrfProtect } from '../middleware/csrf.js';
import { authLimiter, sendOtpLimiter } from '../middleware/rateLimit.js';
import {
  signupSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  linkGoogleSchema,
} from '../validation/schemas.js';

const router = Router();

// 501 when Google OAuth is not configured (ACR-B-07) — shared by both google routes.
function notConfigured(_req, res) {
  return res
    .status(501)
    .json({ code: 'NOT_CONFIGURED', message: 'Google auth not configured in this deployment.' });
}

// CSRF token bootstrap (exempt from CSRF — this IS the token issuer)
router.get('/csrf', csrfToken);

// Signup → creates unverified user + sends OTP (Phase 2 real OTP)
router.post('/signup', authLimiter, validate(signupSchema), authController.signup);

// Login (only if isEmailVerified)
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// OTP
router.post(
  '/send-otp',
  authLimiter,
  sendOtpLimiter,
  validate(sendOtpSchema),
  authController.sendOtp,
);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post(
  '/request-password-reset',
  authLimiter,
  sendOtpLimiter,
  validate(sendOtpSchema),
  authController.requestPasswordReset,
);
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

// Google OAuth (Phase 3) — 501 NOT_CONFIGURED when no GOOGLE_CLIENT_ID (ACR-B-07).
// The client (GET) and callback (GET) are pre-auth and CSRF-exempt (§3.1).

if (googleEnabled) {
  // Initiate: redirect to Google's consent screen.
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failWithError: true }),
    async (req, res, next) => {
      // passport.authenticate('google', { session:false }) resolves the strategy
      // and sets req.user (the find-or-create result) WITHOUT calling req.logIn
      // (no passport serializers configured here). We then establish the app's
      // own session (req.session.userId) exactly like the login controller.
      try {
        if (!req.user || !req.user._id) {
          return res.redirect('/');
        }
        req.session.userId = req.user._id.toString();
        await new Promise((resolve, reject) =>
          req.session.save((err) => (err ? reject(err) : resolve())),
        );
        return res.redirect('/');
      } catch (err) {
        return next(err);
      }
    },
  );
} else {
  router.get('/google', notConfigured);
  router.get('/google/callback', notConfigured);
}

// Link google account (requires session + csrf)
router.post(
  '/link-google',
  authGuard,
  csrfProtect,
  validate(linkGoogleSchema),
  authController.linkGoogle,
);

// Logout + me
router.post('/logout', csrfProtect, authController.logout);
router.get('/me', optionalAuth, authController.me);

export default router;
