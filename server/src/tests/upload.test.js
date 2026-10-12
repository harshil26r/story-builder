import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import createApp from '../app.js';
import User from '../models/User.js';

// TICKET-31: POST /api/upload (multipart) — AUTH + csrf.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-upload';

function pngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
}

describe('Upload routes (TICKET-31)', () => {
  let server;
  let base;
  let sessionCookie;
  let csrf;
  const writtenFiles = [];

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await User.syncIndexes();
    const app = await createApp(TEST_MONGO);
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;

    // Seed a verified user for the session.
    await User.create({
      name: 'Uploader',
      email: 'uploader@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
    });

    // Get CSRF token
    const csrfRes = await fetch(`${base}/api/auth/csrf`);
    const cookie = csrfRes.headers.getSetCookie().find((c) => c.startsWith('csrfToken='));
    const value = cookie.split(';')[0].split('=').slice(1).join('=');
    csrf = { token: value, cookie: `csrfToken=${value}` };

    // Login
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email: 'uploader@example.com', password: 'password1' }),
    });
    sessionCookie = loginRes.headers
      .getSetCookie()
      .find((c) => c.startsWith('connect.sid='))
      .split(';')[0];
  });

  afterEach(() => {
    // Clean any uploaded files written to disk by this test run.
    for (const f of writtenFiles.splice(0)) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {
        // ignore
      }
    }
  });

  afterAll(async () => {
    if (server) server.close();
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  async function postUpload(form, { authenticated = true, withCsrf = true } = {}) {
    const headers = {};
    const cookies = [];
    if (authenticated) cookies.push(sessionCookie);
    if (withCsrf) {
      cookies.push(csrf.cookie);
      headers['x-csrf-token'] = csrf.token;
    }
    if (cookies.length) headers.Cookie = cookies.join('; ');
    const res = await fetch(`${base}/api/upload`, {
      method: 'POST',
      headers,
      body: form,
    });
    return res;
  }

  function formWithFile(fileBuffer, filename, mimetype, folder = 'avatars') {
    const form = new FormData();
    form.append('file', new Blob([fileBuffer], { type: mimetype }), filename);
    form.append('folder', folder);
    return form;
  }

  it('POST /api/upload with valid image → 200 { url } in /uploads/avatars/', async () => {
    const res = await postUpload(formWithFile(pngBuffer(), 'a.png', 'image/png', 'avatars'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^\/uploads\/avatars\//);
    expect(body.url).toContain('.png');
    // Verify the file exists on disk.
    const publicId = body.url.replace(/^\/uploads\//, '');
    const abs = path.resolve(UPLOADS_DIR, publicId);
    expect(fs.existsSync(abs)).toBe(true);
    writtenFiles.push(abs);
  });

  it('POST /api/upload covers folder → 200 { url } in /uploads/covers/', async () => {
    const res = await postUpload(formWithFile(pngBuffer(), 'c.png', 'image/png', 'covers'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^\/uploads\/covers\//);
    const publicId = body.url.replace(/^\/uploads\//, '');
    writtenFiles.push(path.resolve(UPLOADS_DIR, publicId));
  });

  it('file > 5MB → 413', async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 100, 0x61);
    const res = await postUpload(formWithFile(big, 'big.png', 'image/png', 'avatars'));
    expect(res.status).toBe(413);
  });

  it('non-image on avatar folder → 400 INVALID_FILE', async () => {
    const text = Buffer.from('hello not an image', 'utf-8');
    const res = await postUpload(formWithFile(text, 'fake.png', 'image/png', 'avatars'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_FILE');
  });

  it('no file field → 400 INVALID_FILE', async () => {
    const form = new FormData();
    form.append('folder', 'avatars');
    const res = await postUpload(form);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_FILE');
  });

  it('unauthenticated → 401 UNAUTHORIZED', async () => {
    const res = await postUpload(formWithFile(pngBuffer(), 'a.png', 'image/png', 'avatars'), {
      authenticated: false,
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
