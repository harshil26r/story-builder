import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';

// TICKET-76: POST /api/ai/polish-draft (SSE). Output replaces chapter.content,
// original draft kept in draftContent, version bumped with a mode:'user'
// snapshot (ACR-B-12).

const fakeClient = {
  messages: {
    stream() {
      return (async function* gen() {
        yield {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'Polished ' },
        };
        yield {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'prose.' },
        };
        yield {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', usage: { output_tokens: 12 } },
        };
        yield { type: 'message_stop' };
      })();
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

describe('polish-draft route (TICKET-76)', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-polish';
  let user;
  let cookie;
  let csrf;
  let story;
  let chapter;

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
      email: 'ava-polish@example.com',
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
      body: JSON.stringify({ email: 'ava-polish@example.com', password: 'password1' }),
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
      generationMode: 'ai-enhanced',
      totalChapters: 1,
      wordCount: 2,
    });
    chapter = await Chapter.create({
      storyId: story._id,
      order: 1,
      title: 'Ch. 1',
      content: 'Raw draft.',
      summary: 's1',
      isAIGenerated: false,
      version: 1,
      versions: [
        { version: 1, content: 'Raw draft.', summary: 's1', modifiedAt: new Date(), mode: 'user' },
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

  it('unauthenticated → 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${base}/api/ai/polish-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId: String(story._id), chapterIndex: 1 }),
    });
    expect(res.status).toBe(401);
  });

  it('polishes a draft: content replaced, draft preserved, user-mode snapshot pushed', async () => {
    const res = await fetch(`${base}/api/ai/polish-draft`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ storyId: String(story._id), chapterIndex: 1 }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const events = parseSse(await res.text());
    expect(events[0][0]).toBe('doc-start');
    expect(events.some(([e]) => e === 'delta')).toBe(true);
    const done = events.find(([e]) => e === 'done')[1].saved;
    expect(done.content).toBe('Polished prose.');

    const after = await Chapter.findById(chapter._id);
    expect(after.content).toBe('Polished prose.');
    expect(after.draftContent).toBe('Raw draft.');
    expect(after.version).toBe(2);
    expect(after.versions).toHaveLength(2);
    expect(after.versions[1]).toMatchObject({ version: 2, content: 'Raw draft.', mode: 'user' });
  });

  it('branching story rejects polish with VALIDATION_ERROR event', async () => {
    const branching = await Story.create({
      userId: user._id,
      title: 'Branching',
      premise: 'A branching tale of many futures.',
      pov: '2nd',
      structureType: 'branching',
      generationMode: 'ai-enhanced',
      totalChapters: 0,
    });
    const res = await fetch(`${base}/api/ai/polish-draft`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ storyId: String(branching._id), chapterIndex: 1 }),
    });
    expect(res.status).toBe(200);
    const events = parseSse(await res.text());
    const err = events.find(([e]) => e === 'error');
    expect(err).toBeTruthy();
    expect(err[1].code).toBe('VALIDATION_ERROR');
  });
});
