import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import http from 'http';
import crypto from 'crypto';
import User from '../models/User.js';

// TICKET-28: Google OAuth routes + account linking.
// - env unset  → GET /api/auth/google* → 501 NOT_CONFIGURED, me.googleEnabled=false
// - env set    → GET /api/auth/google → 302 redirect; me.googleEnabled=true
// - link-google with a REAL RS256 id_token (verified against a local JWKS) →
//   200, googleId attached, passwordHash preserved (dual-auth), duplicate → 409.

const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-google';

describe('google auth — NOT_CONFIGURED (env unset)', () => {
  let server;
  let base;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CALLBACK_URL;
    delete process.env.GOOGLE_CERTS_URL;
    vi.resetModules();
    const createApp = (await import('../app.js')).default;
    const app = await createApp(TEST_MONGO);
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    if (server) server.close();
    await User.deleteMany({});
  });

  it('GET /api/auth/google → 501 NOT_CONFIGURED', async () => {
    const res = await fetch(`${base}/api/auth/google`);
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.code).toBe('NOT_CONFIGURED');
  });

  it('GET /api/auth/google/callback → 501 NOT_CONFIGURED', async () => {
    const res = await fetch(`${base}/api/auth/google/callback`);
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.code).toBe('NOT_CONFIGURED');
  });

  it('POST /api/auth/link-google → 501 NOT_CONFIGURED even with a token + session', async () => {
    // Seed a verified user and log in so the AUTH gate passes; the controller
    // must then return 501 because Google OAuth is not configured.
    await User.create({
      name: 'Unconf',
      email: 'unconf@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
      googleId: null,
    });
    const csrfRes = await fetch(`${base}/api/auth/csrf`);
    const cookie = csrfRes.headers.getSetCookie().find((c) => c.startsWith('csrfToken='));
    const value = cookie.split(';')[0].split('=').slice(1).join('=');
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': value },
      body: JSON.stringify({ email: 'unconf@example.com', password: 'password1' }),
    });
    const sidCookie = loginRes.headers
      .getSetCookie()
      .find((c) => c.startsWith('connect.sid='))
      .split(';')[0];

    const res = await fetch(`${base}/api/auth/link-google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': value,
        Cookie: `${cookie}; ${sidCookie}`,
      },
      body: JSON.stringify({ googleAccessToken: 'some-id-token' }),
    });
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.code).toBe('NOT_CONFIGURED');
  });

  it('GET /api/auth/me advertises googleEnabled:false', async () => {
    const res = await fetch(`${base}/api/auth/me`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
    expect(body.googleEnabled).toBe(false);
  });
});

describe('google auth — configured', () => {
  let server;
  let base;
  let certsServer;
  let csrf;
  let sessionCookie;
  let privateKey;
  let kid;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await User.syncIndexes();

    // RSA keypair for a real RS256 id_token, exposed via a local JWKS endpoint.
    const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    privateKey = pair.privateKey;
    const jwk = pair.publicKey.export({ format: 'jwk' });
    kid = 'test-kid-1';

    certsServer = http.createServer((_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] }));
    });
    await new Promise((resolve) => certsServer.listen(0, resolve));
    const certsUrl = `http://127.0.0.1:${certsServer.address().port}/certs`;

    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://127.0.0.1:5000/api/auth/google/callback';
    process.env.GOOGLE_CERTS_URL = certsUrl;

    vi.resetModules();
    const createApp = (await import('../app.js')).default;
    const app = await createApp(TEST_MONGO);
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;

    // Seed a verified password user (dual-auth target).
    await User.create({
      name: 'Google Linker',
      email: 'linker@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
      googleId: null,
    });

    // CSRF + login to get a session for the authenticated link-google call.
    const csrfRes = await fetch(`${base}/api/auth/csrf`);
    const cookie = csrfRes.headers.getSetCookie().find((c) => c.startsWith('csrfToken='));
    const value = cookie.split(';')[0].split('=').slice(1).join('=');
    csrf = { token: value, cookie: `csrfToken=${value}` };

    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email: 'linker@example.com', password: 'password1' }),
    });
    sessionCookie = loginRes.headers
      .getSetCookie()
      .find((c) => c.startsWith('connect.sid='))
      .split(';')[0];
  });

  afterAll(async () => {
    if (server) server.close();
    if (certsServer) certsServer.close();
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  function makeIdToken(overrides = {}) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', kid, typ: 'JWT' };
    const payload = {
      iss: 'accounts.google.com',
      aud: 'test-client-id',
      sub: 'google-user-123',
      email: 'google@example.com',
      email_verified: true,
      exp: now + 3600,
      iat: now,
      ...overrides,
    };
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const signingInput = `${b64(header)}.${b64(payload)}`;
    const signature = crypto
      .sign('RSA-SHA256', Buffer.from(signingInput), privateKey)
      .toString('base64url');
    return `${signingInput}.${signature}`;
  }

  it('GET /api/auth/google → 302 redirect to Google', async () => {
    const res = await fetch(`${base}/api/auth/google`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toContain('accounts.google.com');
    expect(location).toContain('client_id=test-client-id');
  });

  it('GET /api/auth/me advertises googleEnabled:true', async () => {
    const res = await fetch(`${base}/api/auth/me`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.googleEnabled).toBe(true);
  });

  it('POST /api/auth/link-google with a valid RS256 id_token → 200, googleId attached, passwordHash preserved', async () => {
    const token = makeIdToken();
    const res = await fetch(`${base}/api/auth/link-google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf.token,
        Cookie: `${csrf.cookie}; ${sessionCookie}`,
      },
      body: JSON.stringify({ googleAccessToken: token }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    const user = await User.findOne({ email: 'linker@example.com' });
    expect(user.googleId).toBe('google-user-123');
    // Dual-auth: existing passwordHash MUST NOT be clobbered.
    expect(user.passwordHash).toBeTruthy();
    expect(user.passwordHash).not.toBe('password1'); // still bcrypt-hashed
    const bcrypt = await import('bcrypt');
    const matches = await bcrypt.compare('password1', user.passwordHash);
    expect(matches).toBe(true);
  });

  it('POST /api/auth/link-google again → 409 ACCOUNT_ALREADY_LINKED', async () => {
    const token = makeIdToken();
    const res = await fetch(`${base}/api/auth/link-google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf.token,
        Cookie: `${csrf.cookie}; ${sessionCookie}`,
      },
      body: JSON.stringify({ googleAccessToken: token }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('ACCOUNT_ALREADY_LINKED');
  });

  it('link-google with a token signed by the WRONG key → 400 VALIDATION_ERROR', async () => {
    const otherPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const now = Math.floor(Date.now() / 1000);
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const header = { alg: 'RS256', kid, typ: 'JWT' };
    const payload = {
      iss: 'accounts.google.com',
      aud: 'test-client-id',
      sub: 'evil-google-user',
      email: 'evil@example.com',
      exp: now + 3600,
      iat: now,
    };
    const signingInput = `${b64(header)}.${b64(payload)}`;
    const signature = crypto
      .sign('RSA-SHA256', Buffer.from(signingInput), otherPair.privateKey)
      .toString('base64url');
    const badToken = `${signingInput}.${signature}`;

    const res = await fetch(`${base}/api/auth/link-google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf.token,
        Cookie: `${csrf.cookie}; ${sessionCookie}`,
      },
      body: JSON.stringify({ googleAccessToken: badToken }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('unauthenticated link-google → 401 UNAUTHORIZED', async () => {
    const token = makeIdToken();
    const res = await fetch(`${base}/api/auth/link-google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf.token,
        Cookie: csrf.cookie,
      },
      body: JSON.stringify({ googleAccessToken: token }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
