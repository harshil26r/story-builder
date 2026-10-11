import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';

// TICKET-41: Story + Chapter models — create defaults, required/enum
// validation, shareToken sparse-unique index, ContentSnapshot versions array.
// Acceptance mirrors ACR-B-01.
describe('Story + Chapter models (TICKET-41)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-story-model';

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await Story.syncIndexes();
    await Chapter.syncIndexes();
  });

  afterAll(async () => {
    await Story.deleteMany({});
    await Chapter.deleteMany({});
    await mongoose.disconnect();
  });

  function validStory(overrides = {}) {
    return {
      userId: new mongoose.Types.ObjectId(),
      title: 'The Clockwork Heart',
      premise: 'A clockmaker discovers a living brass heart that can restore the dead.',
      pov: '3rd',
      structureType: 'single',
      generationMode: 'full-ai',
      ...overrides,
    };
  }

  describe('Story model', () => {
    it('create succeeds with valid fields — defaults, timestamps', async () => {
      const s = await Story.create(validStory());

      expect(s.title).toBe('The Clockwork Heart');
      expect(s.premise.length).toBeGreaterThanOrEqual(10);
      expect(s.userId).toBeTruthy();
      expect(s.status).toBe('draft');
      expect(s.version).toBe(1);
      expect(s.totalChapters).toBe(1); // single ⇒ 1
      expect(s.isPublic).toBe(false);
      expect(s.shareToken).toBeNull();
      expect(s.characters).toEqual([]);
      expect(s.wordCount).toBe(0);
      expect(s.coverImageUrl).toBeNull();
      expect(s.genre).toBe('general');
      expect(s.tone).toBe('neutral');
      expect(s.targetAudience).toBe('general');
      expect(s.lengthTarget).toBe('medium');
      expect(s.createdAt).toBeInstanceOf(Date);
      expect(s.updatedAt).toBeInstanceOf(Date);
      expect(s.toJSON()).not.toHaveProperty('__v');
      await s.deleteOne();
    });

    it('title is required (1..120)', async () => {
      await expect(Story.create(validStory({ title: undefined }))).rejects.toThrow();
      await expect(Story.create(validStory({ title: 'x'.repeat(121) }))).rejects.toThrow();
      await expect(Story.create(validStory({ title: 'x'.repeat(120) }))).resolves.toBeTruthy();
    });

    it('premise is required (10..5000)', async () => {
      await expect(Story.create(validStory({ premise: undefined }))).rejects.toThrow();
      await expect(
        Story.create(validStory({ premise: 'too short' })), // 9 chars
      ).rejects.toThrow();
      await expect(
        Story.create(validStory({ premise: 'long enough premise here' })),
      ).resolves.toBeTruthy();
    });

    it('structureType is an enum single|linear|branching', async () => {
      await expect(Story.create(validStory({ structureType: 'open-world' }))).rejects.toThrow();
      const linear = await Story.create(validStory({ structureType: 'linear' }));
      expect(linear.structureType).toBe('linear');
      expect(linear.totalChapters).toBe(0);
      const branching = await Story.create(validStory({ structureType: 'branching' }));
      expect(branching.totalChapters).toBe(0);
      await linear.deleteOne();
      await branching.deleteOne();
    });

    it('pov and generationMode enums are enforced', async () => {
      await expect(Story.create(validStory({ pov: '4th' }))).rejects.toThrow();
      await expect(Story.create(validStory({ generationMode: 'manual' }))).rejects.toThrow();
    });

    it('shareToken is unique-indexed (sparse)', async () => {
      const token = 'A'.repeat(48);
      const s1 = await Story.create(validStory({ shareToken: token }));
      expect(s1.shareToken).toBe(token);
      await expect(Story.create(validStory({ shareToken: token }))).rejects.toThrow();

      // Sparse ⇒ two docs with null shareToken coexist.
      const n1 = await Story.create(validStory());
      const n2 = await Story.create(validStory());
      expect(n1.shareToken).toBeNull();
      expect(n2.shareToken).toBeNull();

      const indexes = await Story.collection.indexes();
      const shareIdx = indexes.find((i) => i.key && i.key.shareToken === 1);
      expect(shareIdx).toBeTruthy();
      expect(shareIdx.unique).toBe(true);
      // Sparse semantics: either `sparse:true` or a partial filter that skips
      // nulls. Modern MongoDB cannot mix sparse+partial, so the model uses a
      // unique partial index on string values — equivalent sparse behavior.
      expect(shareIdx.sparse === true || !!shareIdx.partialFilterExpression).toBe(true);
    });
  });

  describe('Chapter model', () => {
    it('create succeeds — defaults (version 1, versions [], timestamps)', async () => {
      const story = await Story.create(validStory());
      const ch = await Chapter.create({
        storyId: story._id,
        order: 1,
        content: 'Once upon a time the clockmaker wound the brass heart.',
        title: 'Chapter One',
        summary: 'The clockmaker finds the heart.',
      });

      expect(ch.storyId.toString()).toBe(story._id.toString());
      expect(ch.order).toBe(1);
      expect(ch.content).toContain('brass heart');
      expect(ch.title).toBe('Chapter One');
      expect(ch.summary).toBe('The clockmaker finds the heart.');
      expect(ch.version).toBe(1);
      expect(ch.isAIGenerated).toBe(false);
      expect(ch.generatedAt).toBeNull();
      expect(ch.draftContent).toBeNull();
      expect(ch.versions).toEqual([]);
      expect(ch.createdAt).toBeInstanceOf(Date);
      expect(ch.toJSON()).not.toHaveProperty('__v');

      await ch.deleteOne();
      await story.deleteOne();
    });

    it('versions is an array of ContentSnapshot {version, content, summary, modifiedAt, mode}', async () => {
      const story = await Story.create(validStory());
      const ch = await Chapter.create({ storyId: story._id, order: 1, content: 'v1 text' });

      ch.versions.push({
        version: 1,
        content: 'v1 text',
        summary: 'first snapshot',
        modifiedAt: new Date('2026-01-01T00:00:00Z'),
        mode: 'ai',
      });
      ch.versions.push({
        version: 2,
        content: 'v2 text',
        summary: 'second snapshot',
        modifiedAt: new Date('2026-01-02T00:00:00Z'),
        mode: 'user',
      });
      await ch.save();

      const reloaded = await Chapter.findById(ch._id);
      expect(reloaded.versions).toHaveLength(2);
      expect(reloaded.versions[0].version).toBe(1);
      expect(reloaded.versions[0].summary).toBe('first snapshot');
      expect(reloaded.versions[0].modifiedAt).toBeInstanceOf(Date);
      expect(reloaded.versions[0].mode).toBe('ai');
      expect(reloaded.versions[1].version).toBe(2);
      expect(reloaded.versions[1].mode).toBe('user');

      await ch.deleteOne();
      await story.deleteOne();
    });

    it('requires storyId and order; order is 1-based', async () => {
      await expect(Chapter.create({ order: 1, content: 'no story' })).rejects.toThrow();
      await expect(
        Chapter.create({ storyId: new mongoose.Types.ObjectId(), content: 'no order' }),
      ).rejects.toThrow();
      await expect(
        Chapter.create({ storyId: new mongoose.Types.ObjectId(), order: 0, content: 'zero' }),
      ).rejects.toThrow();
    });
  });
});
