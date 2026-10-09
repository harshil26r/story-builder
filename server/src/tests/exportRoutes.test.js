import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';

// TICKET-79: GET /api/stories/:id/export/pdf | /export/epub (ACR-B-17, ACR-B-18).
describe('export routes (TICKET-79)', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-export-routes';
  let user;
  let cookie;
  let story;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await User.syncIndexes();
    await Story.syncIndexes();
    await Chapter.syncIndexes();
    const app = await createApp(TEST_MONGO);
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;

    user = await User.create({
      name: 'Ava',
      email: 'ava-export@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
    });

    const csrfRes = await fetch(`${base}/api/auth/csrf`);
    const token = csrfRes.headers
      .getSetCookie()
      .find((c) => c.startsWith('csrfToken='))
      .split(';')[0]
      .split('=')
      .slice(1)
      .join('=');
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
      body: JSON.stringify({ email: 'ava-export@example.com', password: 'password1' }),
    });
    const sid = res.headers
      .getSetCookie()
      .find((c) => c.startsWith('connect.sid='))
      .split(';')[0];
    cookie = `${sid}; csrfToken=${token}`;
  });

  afterAll(async () => {
    if (server) server.close();
    await User.deleteMany({});
    await Story.deleteMany({});
    await Chapter.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Story.deleteMany({});
    await Chapter.deleteMany({});
    story = await Story.create({
      userId: user._id,
      title: 'The Clockwork Heart',
      premise: 'A clockmaker discovers a living brass heart that can restore the dead.',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
      totalChapters: 2,
    });
    await Chapter.create({
      storyId: story._id,
      order: 1,
      title: 'The Brass Heart',
      content: 'Mara turned the key. The brass heart beat once.',
      summary: 's1',
      isAIGenerated: true,
      version: 1,
    });
    await Chapter.create({
      storyId: story._id,
      order: 2,
      title: 'The Long Night',
      content: 'By midnight the workshop was full of wings.',
      summary: 's2',
      isAIGenerated: true,
      version: 1,
    });
  });

  it('GET export/pdf → 200 application/pdf attachment', async () => {
    const res = await fetch(`${base}/api/stories/${story._id}/export/pdf`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('GET export/epub → 200 application/epub+zip', async () => {
    const res = await fetch(`${base}/api/stories/${story._id}/export/epub`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/epub+zip');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('unauthenticated → 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${base}/api/stories/${story._id}/export/pdf`);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('UNAUTHORIZED');
  });

  it('story with no content → 409 STORY_INCOMPLETE', async () => {
    const empty = await Story.create({
      userId: user._id,
      title: 'Empty Book',
      premise: 'Nothing has been written in this empty volume yet.',
      pov: '1st',
      structureType: 'linear',
      generationMode: 'full-ai',
      totalChapters: 0,
    });
    const res = await fetch(`${base}/api/stories/${empty._id}/export/pdf`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('STORY_INCOMPLETE');
  });

  it("another user's story → 404 NOT_FOUND", async () => {
    const other = await User.create({
      name: 'Ben',
      email: 'ben-export@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
    });
    const owned = await Story.create({
      userId: other._id,
      title: 'Not Avas Book',
      premise: 'A story belonging to another author entirely.',
      pov: '1st',
      structureType: 'linear',
      generationMode: 'full-ai',
      totalChapters: 1,
    });
    const res = await fetch(`${base}/api/stories/${owned._id}/export/pdf`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(404);
  });
});
