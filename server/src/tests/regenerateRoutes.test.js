import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';
import { AppError } from '../utils/errors.js';

// TICKET-57: POST /api/stories/:id/regenerate-chapter (only|onward) and
// POST /api/stories/:id/continue — SSE streams (SPEC §3.4, ACR-B-13).
const streamCalls = [];
let callCount = 0;
let streamPlan = [];

const fakeClient = {
  messages: {
    stream(args) {
      streamCalls.push(args.messages);
      const plan = streamPlan[Math.min(callCount, streamPlan.length - 1)] || {
        chunks: ['RT.'],
        stop: 'end_turn',
      };
      callCount += 1;
      return (async function* gen() {
        for (const piece of plan.chunks) {
          yield {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: piece },
          };
        }
        yield {
          type: 'message_delta',
          delta: { stop_reason: plan.stop, usage: { output_tokens: 10 } },
        };
        yield { type: 'message_stop' };
      })();
    },
    async create() {
      return { content: [{ type: 'text', text: 'Regen summary.' }] };
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

describe('regenerate + continue routes (TICKET-57)', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-regenerate-routes';
  let user;
  let cookie;
  let csrf;
  let story;
  let ch1;
  let ch2;

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
      email: 'ava-regen@example.com',
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
      body: JSON.stringify({ email: 'ava-regen@example.com', password: 'password1' }),
    });
    const sid = res.headers
      .getSetCookie()
      .find((c) => c.startsWith('connect.sid='))
      .split(';')[0];
    cookie = `${sid}; csrfToken=${csrf.token}`;
  });

  beforeEach(async () => {
    await Story.deleteMany({});
    await Chapter.deleteMany({});
    streamCalls.length = 0;
    callCount = 0;
    streamPlan = [{ chunks: ['RT.'], stop: 'end_turn' }];

    story = await Story.create({
      userId: user._id,
      title: 'The Clockwork Heart',
      premise: 'A clockmaker discovers a living brass heart that can restore the dead.',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
      totalChapters: 2,
      wordCount: 12,
    });
    ch1 = await Chapter.create({
      storyId: story._id,
      order: 1,
      title: 'Ch. 1',
      content: 'First.',
      summary: 's1',
      isAIGenerated: true,
      version: 1,
      versions: [
        { version: 1, content: 'First.', summary: 's1', modifiedAt: new Date(), mode: 'ai' },
      ],
    });
    ch2 = await Chapter.create({
      storyId: story._id,
      order: 2,
      title: 'Ch. 2',
      content: 'Second.',
      summary: 's2',
      isAIGenerated: true,
      version: 1,
      versions: [
        { version: 1, content: 'Second.', summary: 's2', modifiedAt: new Date(), mode: 'ai' },
      ],
    });
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

  it('regenerate-chapter mode "only" streams SSE and bumps exactly chapter N', async () => {
    const res = await fetch(`${base}/api/stories/${story._id}/regenerate-chapter`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ chapterId: String(ch1._id), mode: 'only' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const events = parseSse(await res.text());
    const dones = events.filter(([e]) => e === 'done').map(([, d]) => d.saved);
    expect(dones).toHaveLength(1);
    expect(dones[0].order).toBe(1);
    expect(dones[0].version).toBe(2);

    const after = await Chapter.findOne({ storyId: story._id, order: 2 });
    expect(after.version).toBe(1);
    expect(after.content).toBe('Second.');
  });

  it('regenerate-chapter mode "onward" streams two done events (N..end)', async () => {
    const res = await fetch(`${base}/api/stories/${story._id}/regenerate-chapter`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ chapterId: String(ch1._id), mode: 'onward' }),
    });
    const events = parseSse(await res.text());
    const dones = events.filter(([e]) => e === 'done').map(([, d]) => d.saved);
    expect(dones.map((d) => d.order)).toEqual([1, 2]);
    expect(dones.every((d) => d.version === 2)).toBe(true);
  });

  it('branching story rejects regenerate with 400 VALIDATION_ERROR event', async () => {
    const branching = await Story.create({
      userId: user._id,
      title: 'Branching',
      premise: 'A branching tale of many futures.',
      pov: '2nd',
      structureType: 'branching',
      generationMode: 'full-ai',
      totalChapters: 1,
    });
    const c = await Chapter.create({
      storyId: branching._id,
      order: 1,
      title: 'N',
      content: 'x',
      summary: 's',
      isAIGenerated: true,
      version: 1,
      versions: [],
    });

    const res = await fetch(`${base}/api/stories/${branching._id}/regenerate-chapter`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ chapterId: String(c._id), mode: 'only' }),
    });
    expect(res.status).toBe(200); // SSE keeps HTTP 200; error rides the stream
    const events = parseSse(await res.text());
    const err = events.find(([e]) => e === 'error');
    expect(err).toBeTruthy();
    expect(err[1].code).toBe('VALIDATION_ERROR');
  });

  it('continue appends chapters via SSE (order 3..4) and bumps totalChapters', async () => {
    const res = await fetch(`${base}/api/stories/${story._id}/continue`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ chaptersCount: 2 }),
    });
    expect(res.status).toBe(200);
    const events = parseSse(await res.text());
    const dones = events.filter(([e]) => e === 'done').map(([, d]) => d.saved);
    expect(dones.map((d) => d.order)).toEqual([3, 4]);
    expect(dones[1].totalChapters).toBe(4);

    const chapters = await Chapter.find({ storyId: story._id }).sort({ order: 1 });
    expect(chapters).toHaveLength(4);
    const refreshed = await Story.findById(story._id);
    expect(refreshed.totalChapters).toBe(4);
  });

  it('continue with no chaptersCount defaults to appending 1 chapter', async () => {
    const res = await fetch(`${base}/api/stories/${story._id}/continue`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({}),
    });
    const events = parseSse(await res.text());
    const dones = events.filter(([e]) => e === 'done').map(([, d]) => d.saved);
    expect(dones.map((d) => d.order)).toEqual([3]);
  });
});
