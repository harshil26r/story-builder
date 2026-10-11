import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';
import { AppError } from '../utils/errors.js';

// TICKET-55/56/57: regenerate (only/onward) + continue + token overflow.
const streamCalls = [];
let callCount = 0;
let streamPlan = [];

const fakeClient = {
  messages: {
    stream(args) {
      streamCalls.push(args.messages);
      const plan = streamPlan[Math.min(callCount, streamPlan.length - 1)] || {
        chunks: [],
        stop: 'end_turn',
      };
      callCount += 1;
      async function* gen() {
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
      }
      return gen();
    },
    async create() {
      return { content: [{ type: 'text', text: 'Consistency summary.' }] };
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

const aiService = await import('../services/aiService.js');

function collect(run) {
  return new Promise((resolve) => {
    const events = [];
    const io = {
      send(event, data) {
        events.push([event, data]);
      },
    };
    run({ io }).then(() => resolve(events));
  });
}

describe('regenerate + continue (TICKET-55/56/57)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-regenerate';
  let userId;
  let story;

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await Story.syncIndexes();
    await Chapter.syncIndexes();
    userId = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    await Chapter.deleteMany({});
    await Story.deleteMany({});
    streamCalls.length = 0;
    callCount = 0;
    streamPlan = [{ chunks: ['Regenerated text. ', 'For chapter.'], stop: 'end_turn' }];
    story = await Story.create({
      userId,
      title: 'The Clockwork Heart',
      premise: 'A clockmaker discovers a living brass heart that can restore the dead.',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
      totalChapters: 3,
      wordCount: 30,
    });
  });

  afterAll(async () => {
    await Chapter.deleteMany({});
    await Story.deleteMany({});
    await mongoose.disconnect();
  });

  async function makeChapter(order, content, version = 1) {
    return Chapter.create({
      storyId: story._id,
      order,
      title: `Chapter ${order}`,
      content,
      summary: `summary ${order}`,
      isAIGenerated: true,
      version,
      versions: [
        { version, content, summary: `summary ${order}`, modifiedAt: new Date(), mode: 'ai' },
      ],
    });
  }

  it('regenerate mode "only": chapter N gets a new version, N-1 untouched (ACR-B-13)', async () => {
    const c1 = await makeChapter(1, 'First.');
    await makeChapter(2, 'Second.');

    const events = await collect(({ io }) =>
      aiService.regenerateChapter(
        {
          userId: String(userId),
          storyId: String(story._id),
          chapterId: String(c1._id),
          mode: 'only',
        },
        { io },
      ),
    );

    const dones = events.filter(([e]) => e === 'done').map(([, d]) => d.saved);
    expect(dones).toHaveLength(1);
    expect(dones[0].order).toBe(1);
    expect(dones[0].version).toBe(2);
    expect(dones[0].content).toBe('Regenerated text. For chapter.');

    const c2 = await Chapter.findOne({ storyId: story._id, order: 2 });
    expect(c2.version).toBe(1);
    expect(c2.content).toBe('Second.');
  });

  it('regenerate mode "onward": N..end regenerated, summaries chained fresh', async () => {
    const c1 = await makeChapter(1, 'First.');
    await makeChapter(2, 'Second.');
    await makeChapter(3, 'Third.');

    const events = await collect(({ io }) =>
      aiService.regenerateChapter(
        {
          userId: String(userId),
          storyId: String(story._id),
          chapterId: String(c1._id),
          mode: 'onward',
        },
        { io },
      ),
    );

    const dones = events.filter(([e]) => e === 'done').map(([, d]) => d.saved);
    expect(dones.map((d) => d.order)).toEqual([1, 2, 3]);
    expect(dones.map((d) => d.version)).toEqual([2, 2, 2]);

    const c1after = await Chapter.findOne({ storyId: story._id, order: 1 });
    expect(c1after.versions).toHaveLength(2);
    expect(c1after.versions[1].mode).toBe('ai');
  });

  it('continueStory appends chapters and grows totalChapters', async () => {
    await makeChapter(1, 'First.');

    const events = await collect(({ io }) =>
      aiService.continueStory(
        { userId: String(userId), storyId: String(story._id), chaptersCount: 2 },
        { io },
      ),
    );

    const dones = events.filter(([e]) => e === 'done').map(([, d]) => d.saved);
    expect(dones.map((d) => d.order)).toEqual([2, 3]);
    expect(dones[0].totalChapters).toBe(3);

    const chapters = await Chapter.find({ storyId: story._id }).sort({ order: 1 });
    expect(chapters).toHaveLength(3);
    expect(chapters[2].content).toBe('Regenerated text. For chapter.');
    const refreshed = await Story.findById(story._id);
    expect(refreshed.totalChapters).toBe(3);
  });

  it('decision: branching stories reject regenerate (400)', async () => {
    const branching = await Story.create({
      userId,
      title: 'Branching',
      premise: 'Branches everywhere.',
      pov: '3rd',
      structureType: 'branching',
      generationMode: 'full-ai',
      totalChapters: 1,
    });
    const c = await makeChapter(1, 'First.');

    await expect(
      aiService.regenerateChapter(
        { userId: String(userId), storyId: String(branching._id), chapterId: String(c._id) },
        {},
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('token overflow: continues in a follow-up call and merges the content (ACR-B-15)', async () => {
    await makeChapter(1, 'First.');
    streamPlan = [
      { chunks: ['A beginning. '], stop: 'max_tokens' },
      { chunks: ['A middle. ', 'An ending.'], stop: 'end_turn' },
    ];

    const events = await collect(({ io }) =>
      aiService.continueStory(
        { userId: String(userId), storyId: String(story._id), chaptersCount: 1 },
        { io },
      ),
    );

    const done = events.find(([e]) => e === 'done')[1].saved;
    expect(done.order).toBe(2);
    expect(done.content).toBe('A beginning. A middle. An ending.');
    expect(callCount).toBe(2);
    const assistantTurn = streamCalls[1].find((m) => m.role === 'assistant');
    expect(assistantTurn.content).toContain('A beginning.');
    const userTurns = streamCalls[1].filter((m) => m.role === 'user');
    expect(userTurns[userTurns.length - 1].content).toContain('Continue');
  });
});
