import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';
import Story from '../models/Story.js';
import BranchNode from '../models/BranchNode.js';

// TICKET-75: POST /api/ai/generate-node (SSE) for branching stories.
// Streams doc-start with nodeId → deltas → summary → done with a node having
// 2–4 choices persisted via nodeService.addChoice (ACR-B-12). Error paths:
// non-branching story → VALIDATION_ERROR; unknown parent → NOT_FOUND.

const SCENE =
  'Dust motes swirl in the lantern beam.\n\n' +
  '[[CHOICE: Descend into the crypt]]\n' +
  '[[CHOICE: Call for help]]\n' +
  '[[CHOICE: Bar the door]]';

let streamIsUnavailable = false;

const fakeClient = {
  messages: {
    stream() {
      if (streamIsUnavailable) return Promise.reject(new Error('no'));
      async function* gen() {
        yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: SCENE } };
        yield {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', usage: { output_tokens: 45 } },
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
    return streamIsUnavailable ? null : fakeClient;
  },
  model: 'test-model',
  maxTokensPerChapter: 6000,
  available: true,
  default: {
    get client() {
      return streamIsUnavailable ? null : fakeClient;
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

describe('AI generate-node route (TICKET-75)', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-ai-node-routes';
  let user;
  let cookie;
  let csrf;
  let branchingStory;
  let linearStory;
  let parentNode;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await User.syncIndexes();
    await Story.syncIndexes();
    await BranchNode.syncIndexes();
    const app = await createApp(TEST_MONGO);
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;

    user = await User.create({
      name: 'Ava',
      email: 'ava-node@example.com',
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
      body: JSON.stringify({ email: 'ava-node@example.com', password: 'password1' }),
    });
    const sid = res.headers
      .getSetCookie()
      .find((c) => c.startsWith('connect.sid='))
      .split(';')[0];
    cookie = `${sid}; csrfToken=${csrf.token}`;

    branchingStory = await Story.create({
      userId: user._id,
      title: 'Hall of Paths',
      premise: 'A wanderer finds a hall where every door opens onto a life not lived.',
      genre: 'fantasy',
      tone: 'grave',
      pov: '2nd',
      structureType: 'branching',
      generationMode: 'full-ai',
      totalChapters: 0,
    });

    parentNode = await BranchNode.create({
      storyId: branchingStory._id,
      title: 'The Gate',
      content: 'You stand before the iron gate.',
      summary: 'The hero stands at the iron gate.',
      isStart: true,
      version: 1,
    });

    linearStory = await Story.create({
      userId: user._id,
      title: 'Straight Road',
      premise: 'A traveler walks the only road that exists.',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
      totalChapters: 0,
    });
  });

  afterAll(async () => {
    if (server) server.close();
    await User.deleteMany({});
    await Story.deleteMany({});
    await BranchNode.deleteMany({});
    await mongoose.disconnect();
  });

  function headers() {
    return { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token, Cookie: cookie };
  }

  it('unauthenticated POST /api/ai/generate-node → 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${base}/api/ai/generate-node`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId: String(branchingStory._id),
        parentNodeId: String(parentNode._id),
      }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('missing storyId body → 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${base}/api/ai/generate-node`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('streams doc-start (with nodeId) → deltas → summary → done with 3 persisted choices', async () => {
    const res = await fetch(`${base}/api/ai/generate-node`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        storyId: String(branchingStory._id),
        parentNodeId: String(parentNode._id),
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const events = parseSse(await res.text());
    const names = events.map(([e]) => e);

    expect(names[0]).toBe('doc-start');
    expect(names).toContain('delta');
    expect(names).toContain('summary');
    expect(names[names.length - 1]).toBe('done');

    const docStart = events.find(([e]) => e === 'doc-start')[1];
    expect(typeof docStart.nodeId).toBe('string');
    expect(docStart.structureType).toBe('branching');
    expect(docStart.storyId).toBe(String(branchingStory._id));

    const done = events.find(([e]) => e === 'done')[1];
    expect(done.saved._id).toBe(docStart.nodeId);
    expect(done.saved.storyId).toBe(String(branchingStory._id));
    expect(done.saved.choices.map((c) => c.label)).toEqual([
      'Descend into the crypt',
      'Call for help',
      'Bar the door',
    ]);
    expect(done.saved.isStart).toBe(false);

    const node = await BranchNode.findById(done.saved._id);
    expect(node).toBeTruthy();
    expect(node.isAIGenerated).toBe(true);
    expect(node.parentId.toString()).toBe(String(parentNode._id));
    expect(node.choices).toHaveLength(3);
    expect(node.choices[0].label).toBe('Descend into the crypt');
  });

  it('non-branching story → error event VALIDATION_ERROR', async () => {
    const res = await fetch(`${base}/api/ai/generate-node`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ storyId: String(linearStory._id) }),
    });
    expect(res.status).toBe(200);
    const events = parseSse(await res.text());
    const err = events.find(([e]) => e === 'error');
    expect(err).toBeTruthy();
    expect(err[1].code).toBe('VALIDATION_ERROR');
  });

  it('unknown parentNodeId → error event NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await fetch(`${base}/api/ai/generate-node`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ storyId: String(branchingStory._id), parentNodeId: String(fakeId) }),
    });
    expect(res.status).toBe(200);
    const events = parseSse(await res.text());
    const err = events.find(([e]) => e === 'error');
    expect(err).toBeTruthy();
    expect(err[1].code).toBe('NOT_FOUND');
  });

  it('when AI client is unavailable → error AI_UNAVAILABLE', async () => {
    streamIsUnavailable = true;
    const res = await fetch(`${base}/api/ai/generate-node`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        storyId: String(branchingStory._id),
        parentNodeId: String(parentNode._id),
      }),
    });
    expect(res.status).toBe(200);
    const events = parseSse(await res.text());
    const err = events.find(([e]) => e === 'error');
    expect(err).toBeTruthy();
    expect(err[1].code).toBe('AI_UNAVAILABLE');
    streamIsUnavailable = false;
  });
});
