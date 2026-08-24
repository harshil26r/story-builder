import { Passport } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

// StoryBuilder passport config (SPEC §5, §7.1 env contract).
//
// `createPassport({ clientID })` builds a fresh, initialized Passport instance:
// the local strategy is always registered; the google strategy is ONLY
// registered when `clientID` is truthy (GOOGLE_CLIENT_ID set). Routes gate on
// `googleEnabled` and return 501 NOT_CONFIGURED when the strategy is absent
// (ACR-B-07).

export function createPassport({ clientID, clientSecret, callbackURL } = {}) {
  const googleEnabled = Boolean(clientID);
  const passport = new Passport();

  // ── Local (email/password) strategy ───────────────────────────────────────
  // Validates against the User model via .comparePassword. Both a missing hash
  // and a bad password surface the same info message (SPEC §2.2
  // INVALID_CREDENTIALS) — never distinguish the two (user-enumeration risk).
  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async function verify(email, password, done) {
        try {
          const user = await User.findOne({ email: String(email).toLowerCase() });
          if (!user || !user.passwordHash) {
            return done(null, false, { message: 'Invalid email or password.' });
          }
          const ok = await user.comparePassword(password);
          if (!ok) {
            return done(null, false, { message: 'Invalid email or password.' });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // ── Google OAuth2 strategy ────────────────────────────────────────────────
  // Registered ONLY when GOOGLE_CLIENT_ID is set (env contract §7.1). The
  // verify callback performs find-or-create semantics for the Google login flow.
  if (googleEnabled) {
    passport.use(
      new GoogleStrategy(
        {
          clientID,
          clientSecret: clientSecret || '',
          callbackURL: callbackURL || 'http://localhost:5000/api/auth/google/callback',
        },
        async function googleVerify(accessToken, refreshToken, profile, done) {
          try {
            const googleId = String(profile.id);
            const email = (
              (profile.emails && profile.emails[0] && profile.emails[0].value) || ''
            ).toLowerCase();

            let user = await User.findOne({ googleId });
            if (!user && email) {
              user = await User.findOne({ email });
              if (user && !user.googleId) {
                // Dual-auth upgrade: an existing password/user found by email
                // gets the googleId attached — passwordHash is NEVER clobbered.
                user.googleId = googleId;
                await user.save();
              }
            }
            if (!user) {
              user = await User.create({
                name: profile.displayName || 'Story Builder user',
                email: email || `google-${googleId}@login.local`,
                isEmailVerified: true,
                googleId,
              });
            }
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  passport.googleEnabled = googleEnabled;
  return passport;
}

// Default instance — built from the deployment env. Routes import this.
const passport = createPassport({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
});

export const googleEnabled = passport.googleEnabled;
export default passport;