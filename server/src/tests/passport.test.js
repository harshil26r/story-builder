import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { createPassport } from '../config/passport.js';

// TICKET-27: Passport config — local strategy (email/password vs User model)
// and conditional Google strategy registration.
//
// Seam: exercise the local strategy through passport's public `authenticate()`
// with fake req/res (the same seam the routes use), and assert on the strategy
// registry for google presence.

const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-passport';

function fakeReq(overrides = {}) {
  return {
    method: 'POST',
    body: {},
    query: {},
    session: {},
    logIn: (_u, _o, cb) => cb(null),
    ...overrides,
  };
}
function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    status(c) {
      this.statusCode = c;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
    end() {},
    json() {},
    redirect() {},
  };
}

// Exercises passport's public `authenticate('local', cb)` middleware seam with
// fake req/res. Resolves with { user, failed, info } when the strategy's verify
// callback completes (async DB validation).
function authenticateLocal(passport, req) {
  return new Promise((resolve, reject) => {
    const res = fakeRes();
    let done = false;
    const middleware = passport.authenticate('local', (err, user, info) => {
      if (done) return;
      done = true;
      if (err) return reject(err);
      resolve({ user: user || null, failed: !user, info: info || null });
    });
    middleware(req, res, () => {
      if (!done) {
        done = true;
        resolve({ user: req.user || null, failed: false });
      }
    });
  });
}

describe('passport config (TICKET-27)', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await User.syncIndexes();
    await User.create({
      name: 'Passport',
      email: 'passport@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
      googleId: null,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  it('exports an initialized passport instance with a local strategy', async () => {
    const mod = await import('../config/passport.js');
    const passport = mod.default;
    expect(passport).toBeDefined();
    expect(typeof passport.authenticate).toBe('function');
    expect(mod.googleEnabled).toBe(false);
    const local = passport._strategy('local');
    expect(local).toBeTruthy();
    expect(local.name).toBe('local');
  });

  it('validates correct credentials against the User model', async () => {
    const passport = createPassport();
    const req = fakeReq({ body: { email: 'passport@example.com', password: 'password1' } });
    const outcome = await authenticateLocal(passport, req);
    expect(outcome.failed).toBe(false);
    expect(outcome.user).toBeTruthy();
    expect(outcome.user.email).toBe('passport@example.com');
    expect(outcome.user.googleId).toBeNull();
  });

  it('rejects a wrong password', async () => {
    const passport = createPassport();
    const req = fakeReq({ body: { email: 'passport@example.com', password: 'wrong-password' } });
    const outcome = await authenticateLocal(passport, req);
    expect(outcome.failed).toBe(true);
  });

  it('rejects an unknown email', async () => {
    const passport = createPassport();
    const req = fakeReq({ body: { email: 'nobody@example.com', password: 'password1' } });
    const outcome = await authenticateLocal(passport, req);
    expect(outcome.failed).toBe(true);
  });

  it('google strategy registered ONLY when GOOGLE_CLIENT_ID is set', () => {
    const absent = createPassport();
    expect(absent.googleEnabled).toBe(false);
    expect(absent._strategy('google')).toBeUndefined();

    const present = createPassport({ clientID: 'g-id', clientSecret: 'g-secret' });
    expect(present.googleEnabled).toBe(true);
    const google = present._strategy('google');
    expect(google).toBeTruthy();
    expect(google.name).toBe('google');
  });

  it('google verify: creates a new user for an unknown email (find-or-create)', async () => {
    const passport = createPassport({ clientID: 'g-id', clientSecret: 'g-secret' });
    await User.deleteOne({ email: 'new-google@example.com' });
    const google = passport._strategy('google');
    const result = await new Promise((resolve, reject) => {
      google._verify(
        'acc',
        'ref',
        {
          id: 'google-user-new',
          displayName: 'New Google',
          emails: [{ value: 'new-google@example.com' }],
        },
        (err, user) => (err ? reject(err) : resolve(user)),
      );
    });
    expect(result).toBeTruthy();
    expect(result.googleId).toBe('google-user-new');
    expect(result.isEmailVerified).toBe(true);

    const saved = await User.findOne({ email: 'new-google@example.com' });
    expect(saved.googleId).toBe('google-user-new');
    expect(saved.isEmailVerified).toBe(true);
    expect(saved.passwordHash).toBeNull(); // Google-only account
  });

  it('google verify: attaches googleId to an existing password user WITHOUT clobbering passwordHash (dual-auth)', async () => {
    const passport = createPassport({ clientID: 'g-id', clientSecret: 'g-secret' });
    await User.deleteOne({ email: 'dualauth@example.com' });
    await User.create({
      name: 'Dual Auth',
      email: 'dualauth@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
      googleId: null,
    });

    const google = passport._strategy('google');
    const result = await new Promise((resolve, reject) => {
      google._verify(
        'acc',
        'ref',
        {
          id: 'google-user-dual',
          displayName: 'Dual Auth',
          emails: [{ value: 'dualauth@example.com' }],
        },
        (err, user) => (err ? reject(err) : resolve(user)),
      );
    });
    expect(result.googleId).toBe('google-user-dual');
    expect(result.passwordHash).toBeTruthy(); // preserved

    const saved = await User.findOne({ email: 'dualauth@example.com' });
    expect(saved.googleId).toBe('google-user-dual');
    expect(saved.passwordHash).not.toBe('password1'); // still bcrypt-hashed
  });
});
