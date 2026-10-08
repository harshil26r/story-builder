import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';

describe('authGuard middleware (TICKET-16)', () => {
  let server;
  let base;
  let agent;
  let cookieHeader;

  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-guard';

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await User.syncIndexes();

    // Create a test user.
    const user = await User.create({
      name: 'Guard Test',
      email: 'guard@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
    });

    // Boot a real server and log in to get a session cookie.
    const app = await createApp(TEST_MONGO);

    // Protect a test route with authGuard.
    const { authGuard } = await import('../middleware/authGuard.js');
    app.get('/test/protected', authGuard, (req, res) => {
      res.json({ ok: true, userId: req.user._id.toString() });
    });
    app.get(
      '/test/optional',
      (await import('../middleware/authGuard.js')).optionalAuth,
      (req, res) => {
        res.json({ ok: true, user: req.user ? req.user._id.toString() : null });
      },
    );

    // Login route that sets session.
    app.post('/test/login', async (req, res) => {
      req.session.userId = user._id.toString();
      res.json({ ok: true });
    });

    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;

    // Login to get session cookie.
    const loginRes = await fetch(`${base}/test/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    cookieHeader = loginRes.headers.getSetCookie().join('; ');
  });

  afterAll(async () => {
    if (server) server.close();
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  it('returns 401 UNAUTHORIZED when no session', async () => {
    if (!base) return;
    const res = await fetch(`${base}/test/protected`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 + req.user when valid session', async () => {
    if (!base) return;
    const res = await fetch(`${base}/test/protected`, {
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.userId).toBe('string');
  });

  it('optionalAuth returns 200 with user:null when no session', async () => {
    if (!base) return;
    const res = await fetch(`${base}/test/optional`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
  });

  it('optionalAuth returns 200 with user when session present', async () => {
    if (!base) return;
    const res = await fetch(`${base}/test/optional`, {
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.user).toBe('string');
  });
});
