import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';
import OtpToken from '../models/OtpToken.js';
import mailer from '../config/mailer.js';

// Auth routes (bugfix: signup does NOT persist the user until OTP is verified).
describe('Auth routes', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test';

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await Promise.all([User.syncIndexes(), OtpToken.syncIndexes()]);
    const app = await createApp(TEST_MONGO, { disableRateLimits: true });
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    if (server) server.close();
    await User.deleteMany({});
    await OtpToken.deleteMany({});
    await mongoose.disconnect();
  });

  async function getCsrf() {
    const res = await fetch(`${base}/api/auth/csrf`);
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith('csrfToken='));
    const value = cookie.split(';')[0].split('=').slice(1).join('=');
    return { token: value, cookie: `csrfToken=${value}` };
  }

  // Intercept the real mailer (console fallback in tests) to capture OTP codes.
  function captureMailer() {
    const sent = [];
    const spy = vi.spyOn(mailer, 'sendMail').mockImplementation(async (opts) => {
      sent.push(opts);
    });
    return { spy, sent, lastCode: () => sent.at(-1)?.text?.match(/\d{6}/)?.[0] };
  }

  it('signup returns 201 WITHOUT creating a user (pending data in OTP token)', async () => {
    const cap = captureMailer();
    const csrf = await getCsrf();
    const email = 'pending@example.com';
    const res = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ name: 'Ada', email, password: 'password1' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // No User row at all — the account is only created after verification.
    expect(await User.findOne({ email })).toBeNull();

    // The pending registration lives on the OTP token (hashed password only).
    const token = await OtpToken.findOne({ email, purpose: 'signup-verify' }).sort({
      createdAt: -1,
    });
    expect(token).toBeTruthy();
    expect(token.data.name).toBe('Ada');
    expect(token.data.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash, not plaintext
    expect(token.data.passwordHash).not.toBe('password1');

    // A code was actually delivered through the mailer.
    expect(cap.sent.length).toBe(1);
    expect(cap.lastCode()).toMatch(/^\d{6}$/);
  });

  it('duplicate verified email → 409 EMAIL_EXISTS', async () => {
    await User.create({
      name: 'Ada',
      email: 'taken@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
    });
    const csrf = await getCsrf();
    const res = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ name: 'Ada2', email: 'taken@example.com', password: 'password1' }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('EMAIL_EXISTS');
  });

  it('signup replaces a stale unverified (pre-bugfix) user so retry works', async () => {
    // Simulate the old broken build: an unverified user already stored in the DB.
    await User.create({
      name: 'Old',
      email: 'stale@example.com',
      passwordHash: 'password1',
      isEmailVerified: false,
    });

    captureMailer();
    const csrf = await getCsrf();
    const res = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ name: 'Fresh', email: 'stale@example.com', password: 'password2' }),
    });
    expect(res.status).toBe(201);

    // The old unverified row is gone; a fresh pending token carries the new data.
    expect(await User.findOne({ email: 'stale@example.com' })).toBeNull();
    const token = await OtpToken.findOne({
      email: 'stale@example.com',
      purpose: 'signup-verify',
    }).sort({ createdAt: -1 });
    expect(token.data.name).toBe('Fresh');
  });

  it('verify-otp creates the user, sets the session, and completes signup', async () => {
    const cap = captureMailer();
    const csrf = await getCsrf();
    const email = 'verified@example.com';

    const signupRes = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ name: 'Grace', email, password: 'password1' }),
    });
    expect(signupRes.status).toBe(201);
    const code = cap.lastCode();

    const verifyRes = await fetch(`${base}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email, code, purpose: 'signup-verify' }),
    });
    expect(verifyRes.status).toBe(200);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.ok).toBe(true);

    const sidCookie = verifyRes.headers.getSetCookie().find((c) => c.startsWith('connect.sid='));
    expect(sidCookie).toBeTruthy();

    // User now exists, verified, with a hashed password.
    const user = await User.findOne({ email });
    expect(user).toBeTruthy();
    expect(user.isEmailVerified).toBe(true);
    expect(user.passwordHash).not.toBe('password1');

    // Session is live.
    const meRes = await fetch(`${base}/api/auth/me`, {
      headers: { Cookie: sidCookie.split(';')[0] },
    });
    const me = await meRes.json();
    expect(me.user).toBeTruthy();
    expect(me.user.email).toBe(email);
    expect(me.user.isEmailVerified).toBe(true);
    expect(me.user.passwordHash).toBeUndefined();

    // And the account can log in with the plaintext password.
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email, password: 'password1' }),
    });
    expect(loginRes.status).toBe(200);
  });

  it('verify-otp with a wrong code → 400 OTP_INVALID, no user created', async () => {
    const cap = captureMailer();
    const csrf = await getCsrf();
    const email = 'wrong@example.com';

    await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ name: 'Wrong', email, password: 'password1' }),
    });
    expect(cap.lastCode()).toBeTruthy();

    const res = await fetch(`${base}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email, code: '000000', purpose: 'signup-verify' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('OTP_INVALID');
    expect(await User.findOne({ email })).toBeNull();
  });

  it('send-otp resend carries the pending registration forward', async () => {
    captureMailer();
    const csrf = await getCsrf();
    const email = 'resend@example.com';

    // Seed a pending signup token dated past the 60s cooldown (createdAt is
    // timestamp-managed, so seed it directly — no updateOne backdating).
    const data = { name: 'Re', passwordHash: '$2a$12$foo' };
    await OtpToken.create({
      email,
      purpose: 'signup-verify',
      otpCodeHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date(Date.now() - 70_000),
      attempts: 0,
      data,
    });

    const res = await fetch(`${base}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email, purpose: 'signup-verify' }),
    });
    expect(res.status).toBe(200);

    const token2 = await OtpToken.findOne({ email, purpose: 'signup-verify' }).sort({
      createdAt: -1,
    });
    expect(token2.data.name).toBe('Re');
    expect(token2.data.passwordHash).toBe(data.passwordHash);
  });

  it('send-otp for signup-verify without a pending signup → 404', async () => {
    const csrf = await getCsrf();
    const res = await fetch(`${base}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email: 'nobody@example.com', purpose: 'signup-verify' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it('missing fields → 400 VALIDATION_ERROR with fields array', async () => {
    const csrf = await getCsrf();
    const res = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ name: 'NoEmail' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.fields)).toBe(true);
  });

  it('login with valid verified credentials sets the session', async () => {
    await User.create({
      name: 'Ada',
      email: 'login@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
    });
    const csrf = await getCsrf();
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email: 'login@example.com', password: 'password1' }),
    });
    expect(res.status).toBe(200);
    const setCookie = res.headers.getSetCookie().find((c) => c.startsWith('connect.sid='));
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).not.toContain('Secure'); // dev
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('login for unverified user → 403 EMAIL_NOT_VERIFIED', async () => {
    await User.create({
      name: 'Unver',
      email: 'unver@example.com',
      passwordHash: 'password1',
      isEmailVerified: false,
    });
    const csrf = await getCsrf();
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email: 'unver@example.com', password: 'password1' }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('GET /api/auth/me returns { user } after login', async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email: 'login@example.com', password: 'password1' }),
    });
    const sidCookie = loginRes.headers
      .getSetCookie()
      .find((c) => c.startsWith('connect.sid='))
      .split(';')[0];

    const meRes = await fetch(`${base}/api/auth/me`, { headers: { Cookie: sidCookie } });
    expect(meRes.status).toBe(200);
    const me = await meRes.json();
    expect(me.user).toBeTruthy();
    expect(me.user.email).toBe('login@example.com');
    expect(me.user.passwordHash).toBeUndefined(); // not leaked
  });

  it('logout destroys the session', async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email: 'login@example.com', password: 'password1' }),
    });
    const sidCookie = loginRes.headers
      .getSetCookie()
      .find((c) => c.startsWith('connect.sid='))
      .split(';')[0];

    const outRes = await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: { 'x-csrf-token': csrf.token, Cookie: `${csrf.cookie}; ${sidCookie}` },
    });
    expect(outRes.status).toBe(200);

    const meRes = await fetch(`${base}/api/auth/me`, { headers: { Cookie: sidCookie } });
    const me = await meRes.json();
    expect(me.user).toBeNull();
  });
});
