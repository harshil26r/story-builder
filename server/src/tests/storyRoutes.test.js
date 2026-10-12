import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';

// TICKET-43: Story REST routes — GET/POST /api/stories,
// GET/PUT/DELETE /api/stories/:id, POST /api/stories/:id/publish,
// public GET /s/:shareToken. All AUTH + CSRF + validate except the public share
// read. baseVersion mismatch → 409 CONFLICT. Cross-user → 404 NOT_FOUND.
describe('Story routes (TICKET-43)', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-story-routes';

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
      email: 'ava@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
    });
    userB = await User.create({
      name: 'Ben',
      email: 'ben@example.com',
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

  function storyPayload(overrides = {}) {
    return {
      title: 'The Clockwork Heart',
      premise: 'A clockmaker discovers a living brass heart that can restore the dead.',
      pov: '3rd',
      structureType: 'single',
      generationMode: 'full-ai',
      characterIds: [],
      ...overrides,
    };
  }

  it('unauthenticated POST /api/stories → 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storyPayload()),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/stories creates a draft story → 201 { story }', async () => {
    const res = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload()),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.story).toBeTruthy();
    expect(body.story.title).toBe('The Clockwork Heart');
    expect(body.story.status).toBe('draft');
    expect(body.story.version).toBe(1);
    expect(body.story.totalChapters).toBe(1);
    expect(body.story.userId).toBe(userA._id.toString());
    expect(body.story.characterIds).toBeUndefined();
  });

  it('POST /api/stories missing premise → 400 VALIDATION_ERROR with fields', async () => {
    const res = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload({ premise: 'short' })),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.fields)).toBe(true);
  });

  it('missing CSRF on POST /api/stories → 403 FORBIDDEN', async () => {
    const res = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify(storyPayload()),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it("GET /api/stories returns only the session user's stories as summaries", async () => {
    const mine = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload({ title: 'A Story' })),
    });
    expect(mine.status).toBe(201);
    const foreign = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfB, cookieB),
      body: JSON.stringify(storyPayload({ title: 'B Story' })),
    });
    expect(foreign.status).toBe(201);

    const res = await fetch(`${base}/api/stories`, { headers: { Cookie: cookieA } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stories).toBeTruthy();
    expect(body.stories.every((s) => s.userId === userA._id.toString())).toBe(true);
    expect(body.stories.some((s) => s.title === 'A Story')).toBe(true);
    expect(body.stories.some((s) => s.title === 'B Story')).toBe(false);
    expect(body.stories[0]).not.toHaveProperty('chapters');
    expect(body.stories[0]).not.toHaveProperty('premise');
  });

  it('GET /api/stories/:id returns the story with chapters (no versions by default)', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload()),
    });
    const story = (await created.json()).story;
    await Chapter.create({
      storyId: story._id,
      order: 1,
      content: 'The brass heart ticks softly.',
      title: 'Chapter One',
      summary: '',
    });

    const res = await fetch(`${base}/api/stories/${story._id}`, { headers: { Cookie: cookieA } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chapters).toBeTruthy();
    expect(body.chapters).toHaveLength(1);
    expect(body.chapters[0].content).toBe('The brass heart ticks softly.');
    expect(body.chapters[0]).not.toHaveProperty('versions');
  });

  it('GET /api/stories/:id?withVersions=1 includes chapter versions', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload()),
    });
    const story = (await created.json()).story;
    const ch = await Chapter.create({
      storyId: story._id,
      order: 1,
      content: 'v1',
      title: 'One',
      summary: '',
    });
    ch.versions.push({
      version: 1,
      content: 'v1',
      summary: 's',
      modifiedAt: new Date(),
      mode: 'ai',
    });
    await ch.save();

    const res = await fetch(`${base}/api/stories/${story._id}?withVersions=1`, {
      headers: { Cookie: cookieA },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chapters[0].versions).toHaveLength(1);
  });

  it('GET /api/stories/:id cross-user → 404 NOT_FOUND (never 403)', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfB, cookieB),
      body: JSON.stringify(storyPayload({ title: 'B Secret' })),
    });
    const story = (await created.json()).story;

    const res = await fetch(`${base}/api/stories/${story._id}`, { headers: { Cookie: cookieA } });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it('invalid story id → 404 NOT_FOUND', async () => {
    const res = await fetch(`${base}/api/stories/not-an-objectid`, {
      headers: { Cookie: cookieA },
    });
    expect(res.status).toBe(404);
  });

  it('PUT /api/stories/:id with matching baseVersion updates and bumps version', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload()),
    });
    const story = (await created.json()).story;

    const res = await fetch(`${base}/api/stories/${story._id}`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ title: 'Renamed', baseVersion: story.version }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.story.title).toBe('Renamed');
    expect(body.story.version).toBe(story.version + 1);
  });

  it('PUT /api/stories/:id with stale baseVersion → 409 CONFLICT with fields', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload()),
    });
    const story = (await created.json()).story;

    // Own mutation bumps version to 2.
    await fetch(`${base}/api/stories/${story._id}`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ tone: 'somber' }),
    });

    const res = await fetch(`${base}/api/stories/${story._id}`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ tone: 'bright', baseVersion: 1 }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('CONFLICT');
    expect(body.fields).toEqual([{ field: 'version', message: 'expected 1, got 2' }]);
  });

  it('PUT /api/stories/:id with baseVersion -1 force-overwrites → { story, lostUpdate: true }', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload()),
    });
    const story = (await created.json()).story;
    await fetch(`${base}/api/stories/${story._id}`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ tone: 'somber' }),
    });

    const res = await fetch(`${base}/api/stories/${story._id}`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ tone: 'bright', baseVersion: -1 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.story.tone).toBe('bright');
    expect(body.lostUpdate).toBe(true);
  });

  it('PUT /api/stories/:id cross-user → 404 NOT_FOUND', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfB, cookieB),
      body: JSON.stringify(storyPayload({ title: 'B Keep' })),
    });
    const story = (await created.json()).story;

    const res = await fetch(`${base}/api/stories/${story._id}`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ title: 'Hacked' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/stories/:id cascades chapters → { ok:true }', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload({ title: 'Delete Me' })),
    });
    const story = (await created.json()).story;
    await Chapter.create({
      storyId: story._id,
      order: 1,
      content: 'soon gone',
      title: 'One',
      summary: '',
    });

    const res = await fetch(`${base}/api/stories/${story._id}`, {
      method: 'DELETE',
      headers: headers(csrfA, cookieA),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(await Story.findById(story._id)).toBeNull();
    expect(await Chapter.countDocuments({ storyId: story._id })).toBe(0);
  });

  it('DELETE /api/stories/:id cross-user → 404 NOT_FOUND, story untouched', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfB, cookieB),
      body: JSON.stringify(storyPayload({ title: 'B Protected' })),
    });
    const story = (await created.json()).story;

    const res = await fetch(`${base}/api/stories/${story._id}`, {
      method: 'DELETE',
      headers: headers(csrfA, cookieA),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
    expect(await Story.findById(story._id)).toBeTruthy();
  });

  it('POST /api/stories/:id/publish generates shareToken → { isPublic, shareToken }', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload()),
    });
    const story = (await created.json()).story;

    const res = await fetch(`${base}/api/stories/${story._id}/publish`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ isPublic: true }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isPublic).toBe(true);
    expect(typeof body.shareToken).toBe('string');
    expect(body.shareToken.length).toBeGreaterThanOrEqual(48);
  });

  it('POST /api/stories/:id/publish unpublish clears shareToken', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload()),
    });
    const story = (await created.json()).story;
    await fetch(`${base}/api/stories/${story._id}/publish`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ isPublic: true }),
    });

    const res = await fetch(`${base}/api/stories/${story._id}/publish`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ isPublic: false }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isPublic).toBe(false);
    expect(body.shareToken).toBeNull();
  });

  it('POST /api/stories/:id/publish invalid body → 400 VALIDATION_ERROR', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload()),
    });
    const story = (await created.json()).story;

    const res = await fetch(`${base}/api/stories/${story._id}/publish`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ isPublic: 'yes' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('POST publish cross-user → 404 NOT_FOUND', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfB, cookieB),
      body: JSON.stringify(storyPayload({ title: 'B Publish' })),
    });
    const story = (await created.json()).story;

    const res = await fetch(`${base}/api/stories/${story._id}/publish`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ isPublic: true }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it('GET /s/:shareToken returns public projection (no PII, no versions, no draftContent)', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify(storyPayload({ title: 'Public Tale' })),
    });
    const story = (await created.json()).story;
    const pub = await fetch(`${base}/api/stories/${story._id}/publish`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ isPublic: true }),
    });
    const { shareToken } = await pub.json();

    const res = await fetch(`${base}/s/${shareToken}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Public Tale');
    expect(body).not.toHaveProperty('userId');
    expect(body).not.toHaveProperty('characters');
    expect(body).not.toHaveProperty('versions');
  });

  it('GET /s/:shareToken is CSRF/GET-exempt (no auth required)', async () => {
    const created = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrfB, cookieB),
      body: JSON.stringify(storyPayload({ title: 'Anon Shareable' })),
    });
    const story = (await created.json()).story;
    const pub = await fetch(`${base}/api/stories/${story._id}/publish`, {
      method: 'POST',
      headers: headers(csrfB, cookieB),
      body: JSON.stringify({ isPublic: true }),
    });
    const { shareToken } = await pub.json();

    const res = await fetch(`${base}/s/${shareToken}`, { headers: { Cookie: cookieA } });
    expect(res.status).toBe(200);
  });

  it('GET /s/:shareToken with invalid/unknown token → 404 NOT_FOUND', async () => {
    const res = await fetch(`${base}/s/this-token-does-not-exist-anywhere-in-the-database`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });
});
