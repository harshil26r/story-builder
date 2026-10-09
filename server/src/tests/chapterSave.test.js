import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';

// TICKET-58: chapter-content persistence — PUT /api/stories/:id/chapters/:chapterId.
// Replaces the client's premise-workaround autosave with a real endpoint.
// Optimistic concurrency on chapter.version (409 CONFLICT); ownership → 404.
describe('chapter content save (TICKET-58)', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-chapter-save';

  let userA;
  let userB;
  let cookieA;
  let cookieB;
  let csrfA;
  let csrfB;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await User.syncIndexes();
    await Story.syncIndexes();
    await Chapter.syncIndexes();
    const app = await createApp(TEST_MONGO);
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;

    userA = await User.create({
      name: 'Ava',
      email: 'ava-save@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
    });
    userB = await User.create({
      name: 'Ben',
      email: 'ben-save@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
    });

    const sessionA = await login(userA.email);
    cookieA = sessionA.cookie;
    csrfA = sessionA.csrf;
    const sessionB = await login(userB.email);
    cookieB = sessionB.cookie;
    csrfB = sessionB.csrf;
  });

  afterAll(async () => {
    if (server) server.close();
    await User.deleteMany({});
    await Story.deleteMany({});
    await Chapter.deleteMany({});
    await mongoose.disconnect();
  });

  async function getCsrf() {
    const res = await fetch(`${base}/api/auth/csrf`);
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith('csrfToken='));
    const value = cookie.split(';')[0].split('=').slice(1).join('=');
    return { token: value, cookie: `csrfToken=${value}` };
  }

  async function login(email) {
    const csrf = await getCsrf();
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email, password: 'password1' }),
    });
    const sidCookie = res.headers
      .getSetCookie()
      .find((c) => c.startsWith('connect.sid='))
      .split(';')[0];
    return { cookie: `${sidCookie}; ${csrf.cookie}`, csrf };
  }

  function headers(csrf, cookie) {
    return {
      'Content-Type': 'application/json',
      'x-csrf-token': csrf.token,
      Cookie: cookie,
    };
  }

  async function makeStory(userId, title = 'The Clockwork Heart') {
    return Story.create({
      userId,
      title,
      premise: 'A clockmaker discovers a living brass heart that can restore the dead.',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
      totalChapters: 1,
    });
  }

  async function makeChapter(storyId, overrides = {}) {
    return Chapter.create({
      storyId,
      order: 1,
      title: 'Ch. 1',
      content: 'The brass heart ticks.',
      summary: 'first',
      isAIGenerated: true,
      version: 1,
      draftContent: null,
      versions: [
        {
          version: 1,
          content: 'The brass heart ticks.',
          summary: 'first',
          modifiedAt: new Date(),
          mode: 'ai',
        },
      ],
      ...overrides,
    });
  }

  function saveUrl(storyId, chapterId) {
    return `${base}/api/stories/${storyId}/chapters/${chapterId}`;
  }

  it('unauthenticated PUT → 401 UNAUTHORIZED', async () => {
    const story = await makeStory(userA._id);
    const chapter = await makeChapter(story._id);
    const res = await fetch(saveUrl(story._id, chapter._id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'x' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('missing CSRF on PUT → 403 FORBIDDEN', async () => {
    const story = await makeStory(userA._id);
    const chapter = await makeChapter(story._id);
    const res = await fetch(saveUrl(story._id, chapter._id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ content: 'x' }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it('200 happy path: updates content, bumps version, pushes a user snapshot, recomputes wordCount', async () => {
    const story = await makeStory(userA._id);
    const chapter = await makeChapter(story._id);

    const res = await fetch(saveUrl(story._id, chapter._id), {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({
        content: 'The clockwork heart awakens in the dark.',
        baseVersion: chapter.version,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chapter.content).toBe('The clockwork heart awakens in the dark.');
    expect(body.chapter.version).toBe(2);
    expect(body.chapter.versions).toHaveLength(2);
    expect(body.chapter.versions[1]).toMatchObject({
      version: 2,
      content: 'The clockwork heart awakens in the dark.',
      summary: 'first',
      mode: 'user',
    });

    const stored = await Chapter.findById(chapter._id);
    expect(stored.version).toBe(2);
    expect(stored.versions[1].mode).toBe('user');

    const storyAfter = await Story.findById(story._id);
    expect(storyAfter.wordCount).toBe(7);
  });

  it('summary-only patch updates summary and bumps version', async () => {
    const story = await makeStory(userA._id);
    const chapter = await makeChapter(story._id);

    const res = await fetch(saveUrl(story._id, chapter._id), {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ summary: 'rewritten opening', baseVersion: chapter.version }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chapter.summary).toBe('rewritten opening');
    expect(body.chapter.content).toBe('The brass heart ticks.');
    expect(body.chapter.version).toBe(2);
    expect(body.chapter.versions[1]).toMatchObject({ summary: 'rewritten opening', mode: 'user' });
  });

  it('updates draftContent when present (ai-enhanced edits)', async () => {
    const story = await makeStory(userA._id);
    const chapter = await makeChapter(story._id, { draftContent: 'my rough draft' });

    const res = await fetch(saveUrl(story._id, chapter._id), {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ content: 'polished edit', baseVersion: chapter.version }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chapter.draftContent).toBe('polished edit');
  });

  it('stale baseVersion → 409 CONFLICT with expected fields', async () => {
    const story = await makeStory(userA._id);
    const chapter = await makeChapter(story._id);
    chapter.version = 2;
    await chapter.save();

    const res = await fetch(saveUrl(story._id, chapter._id), {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ content: 'clobber', baseVersion: 1 }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('CONFLICT');
    expect(body.fields).toEqual([{ field: 'version', message: 'expected 1, got 2' }]);
    expect((await Chapter.findById(chapter._id)).content).toBe('The brass heart ticks.');
  });

  it('baseVersion -1 force-overwrites a stale chapter', async () => {
    const story = await makeStory(userA._id);
    const chapter = await makeChapter(story._id);
    chapter.version = 2;
    chapter.versions.push({
      version: 2,
      content: 'Newer text.',
      summary: 'second',
      modifiedAt: new Date(),
      mode: 'user',
    });
    await chapter.save();

    const res = await fetch(saveUrl(story._id, chapter._id), {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ content: 'forced edit', baseVersion: -1 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chapter.content).toBe('forced edit');
    expect(body.chapter.version).toBe(3);
  });

  it('cross-user story → 404 NOT_FOUND (never 403)', async () => {
    const story = await makeStory(userB._id);
    const chapter = await makeChapter(story._id);

    const res = await fetch(saveUrl(story._id, chapter._id), {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ content: 'sneaky', baseVersion: chapter.version }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
    expect((await Chapter.findById(chapter._id)).content).toBe('The brass heart ticks.');
  });

  it('chapter belonging to a different story → 404 NOT_FOUND', async () => {
    const owned = await makeStory(userA._id);
    const other = await makeStory(userA._id, 'Another Tale');
    const orphan = await makeChapter(other._id);

    const res = await fetch(saveUrl(owned._id, orphan._id), {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ content: 'x', baseVersion: orphan.version }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it('missing story → 404 NOT_FOUND', async () => {
    const chapter = await makeChapter(new mongoose.Types.ObjectId());
    const res = await fetch(saveUrl(new mongoose.Types.ObjectId(), chapter._id), {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ content: 'x', baseVersion: 1 }),
    });
    expect(res.status).toBe(404);
  });

  it('overlong content (60001 chars) → 400 VALIDATION_ERROR', async () => {
    const story = await makeStory(userA._id);
    const chapter = await makeChapter(story._id);
    const res = await fetch(saveUrl(story._id, chapter._id), {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ content: 'x'.repeat(60001), baseVersion: 1 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('empty body → 400 VALIDATION_ERROR', async () => {
    const story = await makeStory(userA._id);
    const chapter = await makeChapter(story._id);
    const res = await fetch(saveUrl(story._id, chapter._id), {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('multiple saves keep wordCount as the real sum across chapters', async () => {
    const story = await makeStory(userA._id);
    const ch1 = await makeChapter(story._id);
    const ch2 = await Chapter.create({
      storyId: story._id,
      order: 2,
      title: 'Ch. 2',
      content: 'Two words here.',
      summary: 'second',
      isAIGenerated: true,
      version: 1,
      versions: [
        {
          version: 1,
          content: 'Two words here.',
          summary: 'second',
          modifiedAt: new Date(),
          mode: 'ai',
        },
      ],
    });

    const res = await fetch(saveUrl(story._id, ch1._id), {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ content: 'a carefully crafted sentence', baseVersion: ch1.version }),
    });
    expect(res.status).toBe(200);
    expect((await Story.findById(story._id)).wordCount).toBe(4 + 3);
    expect(ch2._id).toBeTruthy();
  });
});
