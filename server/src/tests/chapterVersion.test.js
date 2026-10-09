import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';
import { saveChapterVersion } from '../services/storyService.js';

// TICKET-55: version snapshots — versions[] push, doc.version === max retained
// version, retention cap (ACR-B-13, ACR-B-04).
describe('chapter version snapshots (TICKET-55)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-version-snapshots';
  let userId;
  let story;
  let chapter;

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await Story.syncIndexes();
    await Chapter.syncIndexes();
    userId = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    await Chapter.deleteMany({});
    await Story.deleteMany({});
    story = await Story.create({
      userId,
      title: 'The Clockwork Heart',
      premise: 'A clockmaker discovers a living brass heart that can restore the dead.',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
      totalChapters: 0,
    });
    chapter = await Chapter.create({
      storyId: story._id,
      order: 1,
      title: 'Ch. 1',
      content: 'First draft text.',
      summary: 'first',
      isAIGenerated: true,
      version: 1,
      versions: [
        {
          version: 1,
          content: 'First draft text.',
          summary: 'first',
          modifiedAt: new Date(),
          mode: 'ai',
        },
      ],
    });
  });

  afterAll(async () => {
    await Chapter.deleteMany({});
    await Story.deleteMany({});
    await mongoose.disconnect();
  });

  it('pushes a new snapshot, bumps doc.version, and keeps them equal', async () => {
    const updated = await saveChapterVersion({
      chapterId: chapter._id,
      content: 'Rewritten draft.',
      summary: 'second',
      mode: 'ai',
    });
    expect(updated.version).toBe(2);
    expect(updated.content).toBe('Rewritten draft.');
    expect(updated.summary).toBe('second');
    expect(updated.versions).toHaveLength(2);
    expect(updated.versions[1]).toMatchObject({
      version: 2,
      content: 'Rewritten draft.',
      summary: 'second',
      mode: 'ai',
    });
    const maxRetained = Math.max(...updated.versions.map((v) => v.version));
    expect(updated.version).toBe(maxRetained);
  });

  it('caps retained snapshots at CONTENT_VERSION_RETENTION (default 10)', async () => {
    process.env.CONTENT_VERSION_RETENTION = '3';
    let current = chapter;
    for (let i = 2; i <= 8; i += 1) {
      current = await saveChapterVersion({
        chapterId: chapter._id,
        content: `draft ${i}`,
        summary: `s ${i}`,
        mode: 'ai',
      });
    }
    delete process.env.CONTENT_VERSION_RETENTION;
    expect(current.versions).toHaveLength(3);
    expect(current.version).toBe(8);
    expect(Math.min(...current.versions.map((v) => v.version))).toBe(6);
  });

  it('supports user-mode snapshots (ai-enhanced drafts)', async () => {
    const updated = await saveChapterVersion({
      chapterId: chapter._id,
      content: 'User edit.',
      summary: 'edited',
      mode: 'user',
    });
    expect(updated.versions[1].mode).toBe('user');
    expect(updated.version).toBe(2);
  });
});
