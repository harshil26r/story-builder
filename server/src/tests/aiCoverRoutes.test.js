import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';
import Story from '../models/Story.js';

// TICKET-85: POST /api/ai/generate-cover → 200 { imageUrl, altText } (JSON, not
// SSE). authGuard + csrfProtect + validate + aiCostGuard. Description derived
// via buildCoverPrompt when absent and persisted on the story; imageUrl is a
// deterministic SVG data-uri placeholder.

const fakeClient = {
  messages: {
    stream() {
      return (async function* gen() {
        yield {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', usage: { output_tokens: 0 } },
        };
        yield { type: 'message_stop' };
      })();
    },
    create() {
      return Promise.resolve({ content: [{ type: 'text', text: 'T.' }] });
    },
  },
};

vi.mock('../config/gemini.js', () => ({
  client: fakeClient,
  model: 'test-model',
  maxTokensPerChapter: 6000,
  available: true,
  default: { client: fakeClient, model: 'test-model', maxTokensPerChapter: 6000, available: true },
}));

describe('AI generate-cover route (TICKET-85)', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-ai-cover-routes';
  let user;
  let cookie;
  let csrf;
  let story;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await User.syncIndexes();
    await Story.syncIndexes();
    const app = await createApp(TEST_MONGO);
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;

    user = await User.create({
      name: 'Ava',
      email: 'ava-cover@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
    });

    const csrfRes = await fetch(`${base}/api/auth/csrf`);
    const cookieValue = csrfRes.headers
      .getSetCookie()
      .find((c) => c.startsWith('csrfToken='))
      .split(';')[0]
      .split('=')
      .slice(1)
      .join('=');
    csrf = { token: cookieValue };

    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email: 'ava-cover@example.com', password: 'password1' }),
    });
    const sid = res.headers
      .getSetCookie()
      .find((c) => c.startsWith('connect.sid='))
      .split(';')[0];
    cookie = `${sid}; csrfToken=${csrf.token}`;

    story = await Story.create({
      userId: user._id,
      title: 'The Ember Archive',
      premise: 'A scholar guards a library that burns memories into those who read them.',
      genre: 'fantasy',
      tone: 'somber',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
      totalChapters: 1,
    });
  });

  afterAll(async () => {
    if (server) server.close();
    await User.deleteMany({});
    await Story.deleteMany({});
    await mongoose.disconnect();
  });

  function headers() {
    return { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token, Cookie: cookie };
  }

  it('unauthenticated POST /api/ai/generate-cover → 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${base}/api/ai/generate-cover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId: String(story._id) }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('missing storyId → 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${base}/api/ai/generate-cover`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('derives + persists description and returns 200 { imageUrl, altText } (JSON, not SSE)', async () => {
    const res = await fetch(`${base}/api/ai/generate-cover`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ storyId: String(story._id) }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');

    const body = await res.json();
    expect(body.imageUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(body.altText).toContain('The Ember Archive');

    const raw = await Story.findOne({ _id: story._id }).lean().exec();
    expect(raw.coverDescription).toContain('USER TURN — COVER');
    expect(raw.coverImageUrl).toBe(body.imageUrl);
  });

  it('persists a provided description instead of deriving one', async () => {
    const custom = 'A lighthouse built from a single wax candle.';
    const res = await fetch(`${base}/api/ai/generate-cover`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ storyId: String(story._id), description: custom }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageUrl).toBeTruthy();

    const raw = await Story.findOne({ _id: story._id }).lean().exec();
    expect(raw.coverDescription).toBe(custom);
  });

  it('cross-user / unknown story → 404 NOT_FOUND', async () => {
    const other = await Story.create({
      userId: new mongoose.Types.ObjectId(),
      title: 'Foreign Tale',
      premise: 'Not yours to read or open.',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
    });
    const res = await fetch(`${base}/api/ai/generate-cover`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ storyId: String(other._id) }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });
});
