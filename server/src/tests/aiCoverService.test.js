import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Story from '../models/Story.js';

// TICKET-85: aiService.generateCover + themed placeholder SVG generator.
// No image-generation backend exists, so generateCover returns an inline SVG
// data-uri deterministically seeded from the description text (storage only
// handles file uploads → data-uri fallback, per TICKET-85). The description is
// derived from buildCoverPrompt when missing and always persisted on the story.

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
  default: { client: fakeClient, model: 'test-model', maxTokensPerChapter: 6000, available: true },
  client: fakeClient,
  model: 'test-model',
  maxTokensPerChapter: 6000,
  available: true,
}));

const { default: aiService, generateCoverPlaceholder } = await import('../services/aiService.js');

describe('generateCoverPlaceholder (TICKET-85)', () => {
  it('is deterministic — same seed yields byte-identical imageUrl', () => {
    const a = generateCoverPlaceholder({
      description: 'A burning library of memories',
      title: 'The Ember Archive',
    });
    const b = generateCoverPlaceholder({
      description: 'A burning library of memories',
      title: 'The Ember Archive',
    });
    expect(a.imageUrl).toBe(b.imageUrl);
    expect(a.imageUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(a.altText).toBe('Cover for The Ember Archive');
    const svg = Buffer.from(a.imageUrl.split(',')[1], 'base64').toString('utf8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 600 900"');
  });

  it('altText falls back gracefully when no title is given', () => {
    const out = generateCoverPlaceholder({ description: 'Sea at dusk' });
    expect(out.altText.length).toBeGreaterThan(0);
  });
});

describe('aiService generateCover (TICKET-85)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-ai-cover-service';
  let userId;
  let story;

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await Story.syncIndexes();
    userId = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    await Story.deleteMany({});
    story = await Story.create({
      userId,
      title: 'The Ember Archive',
      premise: 'A scholar guards a library that burns memories into those who read them.',
      genre: 'fantasy',
      tone: 'somber',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
    });
  });

  afterAll(async () => {
    await Story.deleteMany({});
    await mongoose.disconnect();
  });

  it('derives a description via buildCoverPrompt when none is provided and persists it', async () => {
    const result = await aiService.generateCover({
      userId: String(userId),
      storyId: String(story._id),
    });
    expect(result.imageUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(result.altText).toContain(story.title);

    const raw = await Story.findOne({ _id: story._id }).lean().exec();
    expect(raw.coverDescription).toContain('USER TURN — COVER');
    expect(raw.coverDescription).toContain('The Ember Archive');
    expect(raw.coverImageUrl).toBe(result.imageUrl);
    expect(raw.version).toBe((story.version || 1) + 1);
  });

  it('persists a provided description instead of deriving it', async () => {
    const custom = 'A lone tower above a field of mirrored waters at dusk.';
    const result = await aiService.generateCover({
      userId: String(userId),
      storyId: String(story._id),
      description: custom,
    });
    const raw = await Story.findOne({ _id: story._id }).lean().exec();
    expect(raw.coverDescription).toBe(custom);
    expect(raw.coverImageUrl).toBe(result.imageUrl);
  });

  it('reuses a previously persisted description when none is provided', async () => {
    const first = await aiService.generateCover({
      userId: String(userId),
      storyId: String(story._id),
    });
    const prev = (await Story.findOne({ _id: story._id }).lean().exec()).coverDescription;
    const second = await aiService.generateCover({
      userId: String(userId),
      storyId: String(story._id),
    });
    const raw = await Story.findOne({ _id: story._id }).lean().exec();
    expect(raw.coverDescription).toBe(prev);
    expect(second.imageUrl).toBe(first.imageUrl);
  });

  it('unknown/foreign story → rejects with NOT_FOUND', async () => {
    const foreign = await Story.create({
      userId: new mongoose.Types.ObjectId(),
      title: 'Foreign Tale',
      premise: 'Not yours to read or open.',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
    });
    await expect(
      aiService.generateCover({ userId: String(userId), storyId: String(foreign._id) }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
