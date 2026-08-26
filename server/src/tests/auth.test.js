import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';

describe('Auth routes (TICKET-17)', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test';

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await User.syncIndexes();
    const app = await createApp(TEST_MONGO);
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    if (server) server.close();
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  async function getCsrf() {
    const res = await fetch(`${base}/api/auth/csrf`);
    // Forward only the name=value pair (as a browser would), not the whole
    // Set-Cookie attribute string — Path=/HttpOnly/SameSite are not Cookie values.
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith('csrfToken='));
    const value = cookie.split(';')[0].split('=').slice(1).join('=');
    const cv = `csrfToken=${value}`;
    return { token: value, cookie: cv };
  }
  async function mutatingHeaders(csrf) {
    return {
      'Content-Type': 'application/json',
      'x-csrf-token': csrf.token,
    };
  }

  it('signup creates user → 201 { ok: true }', async () => {
    const csrf = await getCsrf();
    const res = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', password: 'password1' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const user = await User.findOne({ email: 'ada@example.com' });
    expect(user).toBeTruthy();
    expect(user.isEmailVerified).toBe(false);
  });

  it('duplicate email → 409 EMAIL_EXISTS', async () => {
    const csrf = await getCsrf();
    const res = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ name: 'Ada2', email: 'ada@example.com', password: 'password1' }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('EMAIL_EXISTS');
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

  it('login with valid (verified) credentials sets the session', async () => {
    // Upgrade the test user to verified, then login
    await User.updateOne({ email: 'ada@example.com' }, { isEmailVerified: true });
    const csrf = await getCsrf();
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email: 'ada@example.com', password: 'password1' }),
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
    await User.create({ name: 'Unver', email: 'unver@example.com', passwordHash: 'password1', isEmailVerified: false });
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
    // Log in to get an authenticated cookie
    const csrf = await getCsrf();
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email: 'ada@example.com', password: 'password1' }),
    });
    const sidCookie = loginRes.headers.getSetCookie().find((c) => c.startsWith('connect.sid=')).split(';')[0];

    const meRes = await fetch(`${base}/api/auth/me`, { headers: { Cookie: sidCookie } });
    expect(meRes.status).toBe(200);
    const me = await meRes.json();
    expect(me.user).toBeTruthy();
    expect(me.user.email).toBe('ada@example.com');
    expect(me.user.passwordHash).toBeUndefined(); // not leaked
  });

  it('logout destroys the session', async () => {
    const csrf = await getCsrf();
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email: 'ada@example.com', password: 'password1' }),
    });
    const sidCookie = loginRes.headers.getSetCookie().find((c) => c.startsWith('connect.sid=')).split(';')[0];

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