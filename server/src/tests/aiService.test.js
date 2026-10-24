import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';

// TICKET-52: aiService SSE streaming handler (SPEC §3.3, ACR-B-12, ACR-B-16).
// We mock claude.js with a scriptable fake client and drive the service
// directly, recording the SSE events it emits.

const streamCalls = [];
let streamFailCountdown = 0;
let textChunks = [];
let capturedSignal = null;
let slowChunks = false;
let emptyFinish = false;
let capturedSummaryOpts = null;
let slowSummary = false;
let summaryAbortController = null; // allows tests to abort exactly when summary starts
let abortOnChunkIndex = -1;
let abortControllerRef = null;

const fakeClient = {
  messages: {
    stream(body, opts) {
      streamCalls.push(body);
      capturedSignal = (opts && opts.signal) || null;
      if (streamFailCountdown > 0) {
        streamFailCountdown -= 1;
        return Promise.reject(new Error('provider boom'));
      }
      const signal = capturedSignal;
      async function* gen() {
        if (!emptyFinish) {
          let idx = 0;
          for (const chunk of textChunks) {
            if (abortOnChunkIndex === idx && abortControllerRef) {
              abortControllerRef.abort();
            }
            if (slowChunks && abortOnChunkIndex === -1) await new Promise((r) => setTimeout(r, 1));
            if (signal && signal.aborted) {
              break;
            }
            yield {
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: chunk },
            };
            idx += 1;
          }
        }
        if (signal && signal.aborted) {
          return;
        }
        if (slowChunks && abortOnChunkIndex === -1) await new Promise((r) => setTimeout(r, 1));
        yield {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', usage: { output_tokens: 100 } },
        };
        yield { type: 'message_stop' };
      }
      return gen();
    },
    async create(_body, opts) {
      capturedSummaryOpts = opts || null;
      // If a summaryAbortController is set, abort it as soon as summary starts
      // (simulates client disconnecting exactly when summary begins).
      if (summaryAbortController) {
        summaryAbortController.abort();
        summaryAbortController = null;
      }
      if (slowSummary) await new Promise((r) => setTimeout(r, 20));
      return { content: [{ type: 'text', text: 'Test summary.' }] };
    },
  },
};

vi.mock('../config/gemini.js', () => ({
  default: { client: fakeClient, model: 'test-model', maxTokensPerChapter: 6000, available: true },
  client: fakeClient,
  model: 'test-model',
  maxTokensPerChapter: 6000,
  available: true,
}));

const { default: aiService } = await import('../services/aiService.js');

function recordingIo() {
  const events = [];
  return {
    events,
    send(event, data) {
      events.push([event, data]);
    },
  };
}

function deltaText(events) {
  return events
    .filter(([e]) => e === 'delta')
    .map(([, d]) => d.text)
    .join('');
}

function eventData(events, name) {
  const hit = events.find(([e]) => e === name);
  return hit ? hit[1] : null;
}

describe('aiService generateChapter (TICKET-52)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-ai-service';
  let userId;
  let story;

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await Story.syncIndexes();
    await Chapter.syncIndexes();
    userId = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    await Story.deleteMany({});
    await Chapter.deleteMany({});
    abortOnChunkIndex = -1;
    abortControllerRef = null;
    streamCalls.length = 0;
    streamFailCountdown = 0;
    capturedSignal = null;
    slowChunks = false;
    emptyFinish = false;
    capturedSummaryOpts = null;
    slowSummary = false;
    summaryAbortController = null;
    textChunks = ['Once upon a time, ', 'the lamps ', 'went out forever.'];
    story = await Story.create({
      userId,
      title: 'The Lantern Thief',
      premise: 'A lamplighter discovers the city gaslight is alive and feeding.',
      pov: '1st',
      structureType: 'linear',
      generationMode: 'full-ai',
      totalChapters: 0,
    });
  });

  afterAll(async () => {
    await Story.deleteMany({});
    await Chapter.deleteMany({});
    await mongoose.disconnect();
  });

  it('emits doc-start → deltas → snapshot(≥1/25) → summary → done with saved chapter', async () => {
    const io = recordingIo();
    await aiService.generateChapter(
      { userId: String(userId), storyId: String(story._id), chapterIndex: 1 },
      { io, signal: new AbortController().signal },
    );

    const docStart = eventData(io.events, 'doc-start');
    expect(docStart).toMatchObject({
      storyId: String(story._id),
      structureType: 'linear',
      chapterIndex: 1,
      title: 'The Lantern Thief',
    });
    expect(typeof docStart.jobId).toBe('string');
    expect(deltaText(io.events)).toBe('Once upon a time, the lamps went out forever.');

    const snapshot = eventData(io.events, 'snapshot');
    expect(snapshot.fullTextSoFar).toBe('Once upon a time, the lamps went out forever.');
    expect(snapshot.jobId).toBe(docStart.jobId);

    expect(eventData(io.events, 'summary').summary).toBe('Test summary.');

    const done = eventData(io.events, 'done');
    expect(done.jobId).toBe(docStart.jobId);
    expect(done.saved.content).toBe('Once upon a time, the lamps went out forever.');
    expect(done.saved.summary).toBe('Test summary.');
    expect(done.saved.version).toBe(1);
    expect(done.saved.totalChapters).toBe(1);
    expect(done.saved.wordCount).toBe(9);
    expect(done.saved._id).toBeTruthy();

    const chapter = await Chapter.findOne({ storyId: story._id });
    expect(chapter).toBeTruthy();
    expect(chapter.isAIGenerated).toBe(true);
    expect(chapter.versions).toHaveLength(1);
    expect(chapter.versions[0].mode).toBe('ai');
  });

  it('emits a snapshot every 25 deltas', async () => {
    textChunks = Array.from({ length: 60 }, (_, i) => `t${i} `);
    const io = recordingIo();
    await aiService.generateChapter(
      { userId: String(userId), storyId: String(story._id), chapterIndex: 1 },
      { io, signal: new AbortController().signal },
    );
    const snapshots = io.events.filter(([e]) => e === 'snapshot');
    expect(snapshots.length).toBe(3); // at 25, 50, plus final flush
    expect(snapshots[1][1].fullTextSoFar).toContain('t49');
  });

  it('retries the provider once with backoff, then succeeds', async () => {
    streamFailCountdown = 1;
    const io = recordingIo();
    await aiService.generateChapter(
      { userId: String(userId), storyId: String(story._id), chapterIndex: 1 },
      { io, signal: new AbortController().signal },
    );
    expect(streamCalls.length).toBe(2);
    expect(eventData(io.events, 'done')).toBeTruthy();
  });

  it('emits error AI_UNAVAILABLE after repeated provider failures (no done)', async () => {
    streamFailCountdown = 5;
    const io = recordingIo();
    await aiService.generateChapter(
      { userId: String(userId), storyId: String(story._id), chapterIndex: 1 },
      { io, signal: new AbortController().signal },
    );
    expect(streamCalls.length).toBe(3); // initial + 2 backoff retries
    const err = eventData(io.events, 'error');
    expect(err.code).toBe('AI_UNAVAILABLE');
    expect(eventData(io.events, 'done')).toBeNull();
  });

  it('emits AI_UNAVAILABLE when the provider finishes with no text (no chapter saved)', async () => {
    emptyFinish = true;
    const io = recordingIo();
    await aiService.generateChapter(
      { userId: String(userId), storyId: String(story._id), chapterIndex: 1 },
      { io, signal: new AbortController().signal },
    );
    const err = eventData(io.events, 'error');
    expect(err.code).toBe('AI_UNAVAILABLE');
    expect(err.message).toContain('did not return any text');
    expect(eventData(io.events, 'done')).toBeNull();
    expect(await Chapter.countDocuments({ storyId: story._id })).toBe(0);
  });

  it('aborts the stream when the signal fires and emits no done/error', async () => {
    textChunks = Array.from({ length: 200 }, (_, i) => `c${i} `);
    slowChunks = false;
    const ac = new AbortController();
    abortControllerRef = ac;
    abortOnChunkIndex = 5; // abort deterministically mid-stream
    const io = recordingIo();
    const run = aiService.generateChapter(
      { userId: String(userId), storyId: String(story._id), chapterIndex: 1 },
      { io, signal: ac.signal },
    );
    await run;
    expect(eventData(io.events, 'done')).toBeNull();
    expect(eventData(io.events, 'error')).toBeNull();
  });

  it('unknown resumeGenerationId → error RESUME_EXHAUSTED', async () => {
    const io = recordingIo();
    await aiService.generateChapter(
      {
        userId: String(userId),
        storyId: String(story._id),
        chapterIndex: 1,
        resumeGenerationId: 'nope',
      },
      { io, signal: new AbortController().signal },
    );
    expect(eventData(io.events, 'error').code).toBe('RESUME_EXHAUSTED');
  });

  it('resume: one allowed — replays buffer then continues; second resume → RESUME_EXHAUSTED', async () => {
    const first = recordingIo();
    await aiService.generateChapter(
      { userId: String(userId), storyId: String(story._id), chapterIndex: 1 },
      { io: first, signal: new AbortController().signal },
    );
    const jobId = eventData(first.events, 'doc-start').jobId;

    // After a partial first generation, the job buffer holds the text so far.
    const continuer = recordingIo();
    await aiService.generateChapter(
      {
        userId: String(userId),
        storyId: String(story._id),
        chapterIndex: 1,
        resumeGenerationId: jobId,
      },
      { io: continuer, signal: new AbortController().signal },
    );
    const docStart2 = eventData(continuer.events, 'doc-start');
    expect(docStart2.jobId).toBe(jobId);
    // It replays the buffer then continues appending new deltas.
    expect(deltaText(continuer.events)).toContain('Once upon a time');

    const third = recordingIo();
    await aiService.generateChapter(
      {
        userId: String(userId),
        storyId: String(story._id),
        chapterIndex: 1,
        resumeGenerationId: jobId,
      },
      { io: third, signal: new AbortController().signal },
    );
    expect(eventData(third.events, 'error').code).toBe('RESUME_EXHAUSTED');
  });

  // Issue #9: fix(server): propagate abort signal to generateSummary in linear chapter generation
  it('passes the job abort signal to generateSummary during linear generation', async () => {
    const io = recordingIo();
    await aiService.generateChapter(
      { userId: String(userId), storyId: String(story._id), chapterIndex: 1 },
      { io, signal: new AbortController().signal },
    );

    expect(eventData(io.events, 'done')).toBeTruthy();
    // The summary create() call must have received an options object with a signal
    expect(capturedSummaryOpts).not.toBeNull();
    expect(capturedSummaryOpts.signal).toBeInstanceOf(AbortSignal);
  });

  it('does not commit a chapter when client aborts while summary is in flight', async () => {
    // Wire an AbortController so that the external signal fires the moment
    // the fake summary provider starts (create() is called). This makes the
    // timing deterministic: the abort is guaranteed to happen AFTER the stream
    // finishes but BEFORE generateSummary returns.
    const ac = new AbortController();
    summaryAbortController = ac; // create() will call ac.abort() synchronously
    slowSummary = true; // ensures the await inside create() gives the abort check time
    const io = recordingIo();

    await aiService.generateChapter(
      { userId: String(userId), storyId: String(story._id), chapterIndex: 1 },
      { io, signal: ac.signal },
    );

    expect(eventData(io.events, 'done')).toBeNull();
    expect(eventData(io.events, 'error')).toBeNull();
    expect(await Chapter.countDocuments({ storyId: story._id })).toBe(0);
  });
});
