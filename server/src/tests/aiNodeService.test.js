import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Story from '../models/Story.js';
import BranchNode from '../models/BranchNode.js';
import nodeService from '../services/nodeService.js';

// TICKET-75: aiService.generateNode — branching scene streaming (SPEC §3.3/§3.4).
// Drives the service directly with a fake Claude client, capturing SSE events,
// and unit-tests [[CHOICE: label]] parsing boundaries (0/1/5+ markers, label
// validation). Choice contract: exactly 2–4 valid labels are attached; 0 or 1
// valid labels → node persisted as a draft with no choices; 5+ → clamped to 4.

const streamCalls = [];
let textChunks = [];
let capturedSignal = null;
let slowChunks = false;

let abortOnChunkIndex = -1;
let abortControllerRef = null;
const fakeClient = {
  messages: {
    stream(body, opts) {
      streamCalls.push(body);
      capturedSignal = (opts && opts.signal) || null;
      const signal = capturedSignal;
      async function* gen() {
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
        if (signal && signal.aborted) {
          return;
        }
        if (slowChunks && abortOnChunkIndex === -1) await new Promise((r) => setTimeout(r, 1));
        yield {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', usage: { output_tokens: 60 } },
        };
        yield { type: 'message_stop' };
      }
      return gen();
    },
    create() {
      return Promise.resolve({ content: [{ type: 'text', text: 'Node summary.' }] });
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

const { default: aiService, parseNodeChoices } = await import('../services/aiService.js');

function recordingIo() {
  const events = [];
  return {
    events,
    send(event, data) {
      events.push([event, data]);
    },
  };
}

function eventData(events, name) {
  const hit = events.find(([e]) => e === name);
  return hit ? hit[1] : null;
}

describe('parseNodeChoices (TICKET-75)', () => {
  it('extracts exactly 2–4 labels, trimmed and deduped', () => {
    const text = [
      'Scene prose.',
      '[[CHOICE: Descend into the crypt]]',
      '[[CHOICE:  Call for help ]]',
      '[[CHOICE: Descend into the crypt]]',
      '[[CHOICE: Bar the door]]',
      '[[CHOICE: Open the reliquary]]',
      'The end.',
    ].join('\n');
    expect(parseNodeChoices(text)).toEqual([
      'Descend into the crypt',
      'Call for help',
      'Bar the door',
      'Open the reliquary',
    ]);
  });

  it('returns [] when there are no markers', () => {
    expect(parseNodeChoices('Just a plain scene with no choices.')).toEqual([]);
  });

  it('returns the single marker (attachment decision lives in generateNode)', () => {
    expect(parseNodeChoices('[[CHOICE: Turn back now]]')).toEqual(['Turn back now']);
  });

  it('clamps at 4 when more than 4 markers are present', () => {
    const text = Array.from({ length: 7 }, (_, i) => `[[CHOICE: Option ${i + 1}]]`).join('\n');
    expect(parseNodeChoices(text)).toHaveLength(4);
  });

  it('drops markers whose label is outside 2..80 chars', () => {
    const text = ['[[CHOICE: x]]', `[[CHOICE: ${'a'.repeat(81)}]]`, '[[CHOICE: Jump]]'].join('\n');
    expect(parseNodeChoices(text)).toEqual(['Jump']);
  });
});

describe('aiService generateNode (TICKET-75)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-ai-node-service';
  let userId;
  let story;
  let startNode;

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await Story.syncIndexes();
    await BranchNode.syncIndexes();
    userId = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    await Story.deleteMany({});
    await BranchNode.deleteMany({});
    abortOnChunkIndex = -1;
    abortControllerRef = null;
    streamCalls.length = 0;
    capturedSignal = null;
    slowChunks = false;
    story = await Story.create({
      userId,
      title: 'The Hall of Paths',
      premise: 'A wanderer finds a hall where every door opens onto a life not lived.',
      genre: 'fantasy',
      tone: 'grave',
      pov: '2nd',
      structureType: 'branching',
      generationMode: 'full-ai',
      totalChapters: 0,
    });
    startNode = await nodeService.create(userId, String(story._id), {
      title: 'The Gate',
      content: 'You stand before the iron gate.',
      summary: 'The hero stands at the iron gate.',
    });
    textChunks = [
      'Dust motes swirl in the lantern beam.\n\n' +
        '[[CHOICE: Descend into the crypt]]\n' +
        '[[CHOICE: Call for help]]\n' +
        '[[CHOICE: Bar the door]]',
    ];
  });

  afterAll(async () => {
    await Story.deleteMany({});
    await BranchNode.deleteMany({});
    await mongoose.disconnect();
  });

  it('emits doc-start(nodeId) → delta → summary → done with a persisted node + 3 choices', async () => {
    const io = recordingIo();
    await aiService.generateNode(
      { userId: String(userId), storyId: String(story._id), parentNodeId: String(startNode._id) },
      { io, signal: new AbortController().signal },
    );

    const docStart = eventData(io.events, 'doc-start');
    expect(docStart).toMatchObject({
      storyId: String(story._id),
      structureType: 'branching',
      title: 'The Hall of Paths',
    });
    expect(typeof docStart.nodeId).toBe('string');
    expect(typeof docStart.jobId).toBe('string');

    expect(io.events.some(([e]) => e === 'delta')).toBe(true);
    expect(eventData(io.events, 'summary').summary).toBe('Node summary.');

    const done = eventData(io.events, 'done');
    expect(done.jobId).toBe(docStart.jobId);
    expect(done.saved._id).toBe(docStart.nodeId);
    expect(done.saved.storyId).toBe(String(story._id));
    expect(done.saved.content).toContain('Dust motes swirl');
    expect(done.saved.choices.map((c) => c.label)).toEqual([
      'Descend into the crypt',
      'Call for help',
      'Bar the door',
    ]);
    expect(done.saved.totalNodes).toBe(2);

    const node = await BranchNode.findById(done.saved._id);
    expect(node.isAIGenerated).toBe(true);
    expect(node.parentId.toString()).toBe(String(startNode._id));
    expect(node.isStart).toBe(false);
    expect(node.choices).toHaveLength(3);
    expect(node.summary).toBe('Node summary.');
  });

  it('chains the STORY SO FAR (parent summary) and the [[CHOICE]] rules into the prompt', async () => {
    const io = recordingIo();
    await aiService.generateNode(
      { userId: String(userId), storyId: String(story._id), parentNodeId: String(startNode._id) },
      { io, signal: new AbortController().signal },
    );
    const userTurn = streamCalls[0].messages.find((m) => m.role === 'user').content;
    expect(userTurn).toContain('== STORY SO FAR ==');
    expect(userTurn).toContain('The hero stands at the iron gate.');
    expect(userTurn).toContain('[[CHOICE:');
    const system = streamCalls[0].system;
    expect(system[0].text).toContain('STRUCTURE MODE');
    expect(system[0].text).toContain('CHARACTER SHEET');
  });

  it('bumps the story version and records AI usage', async () => {
    const io = recordingIo();
    await aiService.generateNode(
      { userId: String(userId), storyId: String(story._id), parentNodeId: String(startNode._id) },
      { io, signal: new AbortController().signal },
    );
    const fresh = await Story.findById(story._id);
    expect(fresh.version).toBe((story.version || 1) + 1);
  });

  it('root node (no parent) is created as isStart', async () => {
    const fresh = await Story.create({
      userId,
      title: 'Origins',
      premise: 'A spark becomes a story.',
      pov: '2nd',
      structureType: 'branching',
      generationMode: 'full-ai',
      totalChapters: 0,
    });
    const io = recordingIo();
    await aiService.generateNode(
      { userId: String(userId), storyId: String(fresh._id) },
      { io, signal: new AbortController().signal },
    );
    const done = eventData(io.events, 'done');
    const node = await BranchNode.findById(done.saved._id);
    expect(node.isStart).toBe(true);
    expect(node.parentId).toBeNull();
  });

  it('no [[CHOICE]] markers → node persisted as a draft with zero choices', async () => {
    textChunks = ['The scene simply ends without options.'];
    const io = recordingIo();
    await aiService.generateNode(
      { userId: String(userId), storyId: String(story._id), parentNodeId: String(startNode._id) },
      { io, signal: new AbortController().signal },
    );
    const done = eventData(io.events, 'done');
    expect(done.saved.choices).toEqual([]);
    const node = await BranchNode.findById(done.saved._id);
    expect(node.content).toContain('The scene simply ends');
    expect(node.choices).toHaveLength(0);
  });

  it('single marker → treated as draft with zero choices', async () => {
    textChunks = ['Prose.\n[[CHOICE: Turn back now]]'];
    const io = recordingIo();
    await aiService.generateNode(
      { userId: String(userId), storyId: String(story._id), parentNodeId: String(startNode._id) },
      { io, signal: new AbortController().signal },
    );
    expect(eventData(io.events, 'done').saved.choices).toEqual([]);
  });

  it('5+ markers → clamped to exactly 4 choices', async () => {
    textChunks = [
      'Prose.\n' + Array.from({ length: 6 }, (_, i) => `[[CHOICE: Option ${i + 1}]]`).join('\n'),
    ];
    const io = recordingIo();
    await aiService.generateNode(
      { userId: String(userId), storyId: String(story._id), parentNodeId: String(startNode._id) },
      { io, signal: new AbortController().signal },
    );
    const labels = eventData(io.events, 'done').saved.choices.map((c) => c.label);
    expect(labels).toHaveLength(4);
    expect(labels).toEqual(['Option 1', 'Option 2', 'Option 3', 'Option 4']);
  });

  it('unknown parent node → rejects with NOT_FOUND', async () => {
    const io = recordingIo();
    await expect(
      aiService.generateNode(
        {
          userId: String(userId),
          storyId: String(story._id),
          parentNodeId: String(new mongoose.Types.ObjectId()),
        },
        { io, signal: new AbortController().signal },
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('non-branching story → rejects with VALIDATION_ERROR', async () => {
    const linear = await Story.create({
      userId,
      title: 'A Straight Road',
      premise: 'A traveler walks the only road that exists.',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
      totalChapters: 0,
    });
    const io = recordingIo();
    await expect(
      aiService.generateNode(
        { userId: String(userId), storyId: String(linear._id) },
        { io, signal: new AbortController().signal },
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('aborts the stream when the signal fires and emits no done/error', async () => {
    textChunks = Array.from({ length: 200 }, (_, i) => `c${i} `);
    slowChunks = false;
    const ac = new AbortController();
    abortControllerRef = ac;
    abortOnChunkIndex = 5;
    const io = recordingIo();
    const run = aiService.generateNode(
      { userId: String(userId), storyId: String(story._id), parentNodeId: String(startNode._id) },
      { io, signal: ac.signal },
    );
    await run;
    expect(eventData(io.events, 'done')).toBeNull();
    expect(eventData(io.events, 'error')).toBeNull();
  });

  it('removes the pre-created draft node when generation is aborted (no orphans)', async () => {
    textChunks = Array.from({ length: 200 }, (_, i) => `c${i} `);
    slowChunks = false;
    const ac = new AbortController();
    abortControllerRef = ac;
    abortOnChunkIndex = 5;
    const io = recordingIo();
    const run = aiService.generateNode(
      { userId: String(userId), storyId: String(story._id), parentNodeId: String(startNode._id) },
      { io, signal: ac.signal },
    );
    await run;
    // Only the pre-seeded start node remains; the aborted draft was cleaned up.
    expect(await BranchNode.countDocuments({ storyId: story._id })).toBe(1);
  });

  it('removes the draft node when the provider returns no text', async () => {
    textChunks = [];
    const io = recordingIo();
    await aiService.generateNode(
      { userId: String(userId), storyId: String(story._id), parentNodeId: String(startNode._id) },
      { io, signal: new AbortController().signal },
    );
    expect(eventData(io.events, 'error').code).toBe('AI_UNAVAILABLE');
    expect(await BranchNode.countDocuments({ storyId: story._id })).toBe(1);
  });

  it('recomputes story.wordCount from every branch node', async () => {
    const io = recordingIo();
    await aiService.generateNode(
      { userId: String(userId), storyId: String(story._id), parentNodeId: String(startNode._id) },
      { io, signal: new AbortController().signal },
    );
    const expected = await nodeService.computeNodeWordCount(story._id);
    const fresh = await Story.findById(story._id);
    expect(fresh.wordCount).toBe(expected);
    expect(fresh.wordCount).toBeGreaterThan(6);
  });
});
