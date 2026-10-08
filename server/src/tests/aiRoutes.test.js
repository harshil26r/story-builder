import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';

// TICKET-53: AI routes — POST /api/ai/generate-chapter (SSE).
// Success stream, 401/unauthenticated, CSRF, and AI_UNAVAILABLE when the client
// is unavailable (ACR-B-12, ACR-B-16). Claude config is mocked via a getter so
// a test can flip availability without re-mocking.

const streamBodies = [];
let clientIsAvailable = true;

const fakeClient = {
  messages: {
    stream(body) {
      streamBodies.push(body);
      async function* gen() {
        yield {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'The brass ' },
        };
        yield {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'heart hummed.' },
        };
        yield {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', usage: { output_tokens: 42 } },
        };
        yield { type: 'message_stop' };
      }
      return gen();
    },
    create() {
      return Promise.resolve({ content: [{ type: 'text', text: 'Route summary.' }] });
    },
  },
};

vi.mock('../config/gemini.js', () => ({
  get client() {
    return clientIsAvailable ? fakeClient : null;
  },
  model: 'test-model',
  maxTokensPerChapter: 6000,
  available: true,
  default: {
    get client() {
      return clientIsAvailable ? fakeClient : null;
    },
    model: 'test-model',
    maxTokensPerChapter: 6000,
    available: true,
  },
}));

function parseSse(text) {
  const events = [];
  let event = null;
  const dataLines = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    else if (line === '') {
      if (event) events.push([event, JSON.parse(dataLines.join('\n'))]);
      event = null;
      dataLines.length = 0;
    }
  }
  return events;
}

describe('AI routes (TICKET-53)', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-ai-routes';
  let user;
  let cookie;
  let csrf;
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
      email: 'ava-ai@example.com',
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
      body: JSON.stringify({ email: 'ava-ai@example.com', password: 'password1' }),
    });
    const sid = res.headers
      .getSetCookie()
      .find((c) => c.startsWith('connect.sid='))
      .split(';')[0];
    cookie = `${sid}; csrfToken=${csrf.token}`;

    story = await Story.create({
      userId: user._id,
      title: 'The Clockwork Heart',
      premise: 'A clockmaker discovers a living brass heart that can restore the dead.',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
      totalChapters: 0,
    });
  });

  beforeEach(() => {
    clientIsAvailable = true;
    streamBodies.length = 0;
  });

  afterAll(async () => {
    if (server) server.close();
    await User.deleteMany({});
    await Story.deleteMany({});
    await Chapter.deleteMany({});
    await mongoose.disconnect();
  });

  function headers() {
    return { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token, Cookie: cookie };
  }

  it('unauthenticated POST /api/ai/generate-chapter → 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${base}/api/ai/generate-chapter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId: String(story._id), chapterIndex: 1 }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('invalid body → 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${base}/api/ai/generate-chapter`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ chapterIndex: 1 }), // missing storyId
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('authenticated valid request streams doc-start → deltas → snapshot → summary → done', async () => {
    const res = await fetch(`${base}/api/ai/generate-chapter`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ storyId: String(story._id), chapterIndex: 1 }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const events = parseSse(await res.text());
    const names = events.map(([e]) => e);
    expect(names[0]).toBe('doc-start');
    expect(names).toContain('delta');
    expect(names).toContain('snapshot');
    expect(names).toContain('summary');
    expect(names[names.length - 1]).toBe('done');

    const done = events.find(([e]) => e === 'done')[1];
    expect(done.saved.title).toBe('The Clockwork Heart');
    expect(done.saved.content).toBe('The brass heart hummed.');
    expect(done.saved.summary).toBe('Route summary.');
    expect(done.saved.totalChapters).toBe(1);

    const chapter = await Chapter.findOne({ storyId: story._id });
    expect(chapter).toBeTruthy();
    expect(chapter.content).toBe('The brass heart hummed.');
  });

  it('when the AI client is unavailable → error AI_UNAVAILABLE (still HTTP 200)', async () => {
    clientIsAvailable = false;
    const res = await fetch(`${base}/api/ai/generate-chapter`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ storyId: String(story._id), chapterIndex: 1 }),
    });
    expect(res.status).toBe(200);
    const events = parseSse(await res.text());
    const err = events.find(([e]) => e === 'error');
    expect(err).toBeTruthy();
    expect(err[1].code).toBe('AI_UNAVAILABLE');
  });
});
