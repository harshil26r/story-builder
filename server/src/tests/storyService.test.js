import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';
import Character from '../models/Character.js';
import storyService from '../services/storyService.js';

// TICKET-42: storyService — CRUD + optimistic concurrency + publish/share +
// word count. Every method is ownership-scoped (other users' stories → 404).
describe('storyService (TICKET-42)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-story-service';
  let userIdA;
  let userIdB;

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await Story.syncIndexes();
    await Chapter.syncIndexes();
    userIdA = new mongoose.Types.ObjectId();
    userIdB = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await Story.deleteMany({});
    await Chapter.deleteMany({});
    await Character.deleteMany({});
    await mongoose.disconnect();
  });

  function storyInput(overrides = {}) {
    return {
      title: 'The Clockwork Heart',
      premise: 'A clockmaker discovers a living brass heart that can restore the dead.',
      pov: '3rd',
      structureType: 'single',
      generationMode: 'full-ai',
      ...overrides,
    };
  }

  it('create(userId, input) → draft Story; totalChapters 1 for single, version 1, disclaimerText default', async () => {
    const s = await storyService.create(userIdA, storyInput());
    expect(s.userId.toString()).toBe(userIdA.toString());
    expect(s.title).toBe('The Clockwork Heart');
    expect(s.status).toBe('draft');
    expect(s.version).toBe(1);
    expect(s.totalChapters).toBe(1);
    expect(typeof s.disclaimerText).toBe('string');
    expect(s.disclaimerText.length).toBeGreaterThan(0);
  });

  it('create copies characterIds into story.characters', async () => {
    const c = await Character.create({
      userId: userIdA,
      name: 'Test',
      role: 'protagonist',
    });
    const s = await storyService.create(userIdA, storyInput({ characterIds: [c._id] }));
    expect(s.characters.map((x) => x.toString())).toContain(c._id.toString());
  });

  it('totalChapters is 0 for linear/branching at create (populated on generation)', async () => {
    const linear = await storyService.create(userIdA, storyInput({ structureType: 'linear' }));
    expect(linear.totalChapters).toBe(0);
    const branching = await storyService.create(
      userIdA,
      storyInput({ structureType: 'branching' }),
    );
    expect(branching.totalChapters).toBe(0);
  });

  it('list(userId) returns StorySummary[] (no chapters/nodes), sorted updatedAt desc', async () => {
    const a1 = await storyService.create(userIdA, storyInput({ title: 'A Older' }));
    await new Promise((r) => setTimeout(r, 20));
    const a2 = await storyService.create(userIdA, storyInput({ title: 'A Newer' }));
    await storyService.create(userIdB, storyInput({ title: 'B Private' }));

    const listA = await storyService.list(userIdA);
    expect(Array.isArray(listA)).toBe(true);
    const titles = listA.map((s) => s.title);
    expect(titles).toContain('A Older');
    expect(titles).not.toContain('B Private');
    // sorted updatedAt desc — the most recent is first.
    expect(listA[0]._id.toString()).toBe(a2._id.toString());
    const item = listA.find((s) => s.title === 'A Older');
    expect(item).not.toHaveProperty('chapters');
    expect(item).not.toHaveProperty('nodes');
    expect(typeof item.updatedAt).toBe('string');
    expect(item.status).toBe('draft');

    await a1.deleteOne();
    await a2.deleteOne();
  });

  it('get(userId, id) returns Story with chapters; without versions by default', async () => {
    const s = await storyService.create(userIdA, storyInput());
    await Chapter.create({
      storyId: s._id,
      order: 1,
      content: 'first chapter content',
      title: 'One',
      summary: '',
    });

    const got = await storyService.get(userIdA, s._id);
    expect(got._id.toString()).toBe(s._id.toString());
    expect(got.structureType).toBe('single');
    expect(got.chapters).toHaveLength(1);
    expect(got.chapters[0].content).toBe('first chapter content');
    expect(got.chapters[0]).not.toHaveProperty('versions');
  });

  it('get(userId, id, { withVersions: true }) includes chapter versions', async () => {
    const s = await storyService.create(userIdA, storyInput());
    const ch = await Chapter.create({
      storyId: s._id,
      order: 1,
      content: 'v1',
      title: 'One',
      summary: '',
    });
    ch.versions.push({
      version: 1,
      content: 'v1',
      summary: 's',
      modifiedAt: new Date(),
      mode: 'ai',
    });
    await ch.save();

    const got = await storyService.get(userIdA, s._id, { withVersions: true });
    expect(got.chapters[0].versions).toBeTruthy();
    expect(got.chapters[0].versions).toHaveLength(1);
  });

  it('get for another user → NotFoundError 404', async () => {
    const s = await storyService.create(userIdA, storyInput());
    await expect(storyService.get(userIdB, s._id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('update(userId, id, patch) with matching baseVersion succeeds and bumps version', async () => {
    const s = await storyService.create(userIdA, storyInput());
    const updated = await storyService.update(userIdA, s._id, { title: 'Renamed' }, s.version);

    expect(updated.title).toBe('Renamed');
    expect(updated.version).toBe(s.version + 1);

    const reloaded = await Story.findById(s._id);
    expect(reloaded.title).toBe('Renamed');
    expect(reloaded.version).toBe(s.version + 1);
  });

  it('update without baseVersion succeeds (no concurrency guard)', async () => {
    const s = await storyService.create(userIdA, storyInput());
    const updated = await storyService.update(userIdA, s._id, { disclaimerText: 'custom' });
    expect(updated.disclaimerText).toBe('custom');
  });

  it('update with stale baseVersion → ConflictError 409 with field version', async () => {
    const s = await storyService.create(userIdA, storyInput());
    await storyService.update(userIdA, s._id, { tone: 'somber' }); // bumps to 2

    await expect(
      storyService.update(userIdA, s._id, { tone: 'bright' }, 1), // expected 1, got 2
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
      fields: [{ field: 'version', message: 'expected 1, got 2' }],
    });
  });

  it('update with baseVersion -1 force-overwrites and sets lostUpdate:true', async () => {
    const s = await storyService.create(userIdA, storyInput());
    await storyService.update(userIdA, s._id, { tone: 'somber' }); // now version 2

    const forced = await storyService.update(userIdA, s._id, { tone: 'bright' }, -1);
    expect(forced.tone).toBe('bright');
    expect(forced.lostUpdate).toBe(true);
    expect(forced.version).toBe(3);

    // not persisted
    const reloaded = await Story.findById(s._id);
    expect(reloaded.lostUpdate).toBeUndefined();
  });

  it('update for another user → NotFoundError 404', async () => {
    const s = await storyService.create(userIdA, storyInput());
    await expect(
      storyService.update(userIdB, s._id, { title: 'Hack' }, s.version),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('remove(userId, id) cascades chapters; wrong user → NotFoundError', async () => {
    const s = await storyService.create(userIdA, storyInput());
    await Chapter.create({ storyId: s._id, order: 1, content: 'c1', title: 'One', summary: '' });
    await Chapter.create({ storyId: s._id, order: 2, content: 'c2', title: 'Two', summary: '' });

    await storyService.remove(userIdA, s._id);
    expect(await Story.findById(s._id)).toBeNull();
    expect(await Chapter.countDocuments({ storyId: s._id })).toBe(0);

    const protectedStory = await storyService.create(userIdA, storyInput());
    await expect(storyService.remove(userIdB, protectedStory._id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    expect(await Story.findById(protectedStory._id)).toBeTruthy();
  });

  it('publish(userId, id, true) generates a shareToken (base64url, >=48 chars); unpublish clears it', async () => {
    const s = await storyService.create(userIdA, storyInput());

    const pub = await storyService.publish(userIdA, s._id, true);
    expect(pub.isPublic).toBe(true);
    expect(typeof pub.shareToken).toBe('string');
    expect(pub.shareToken.length).toBeGreaterThanOrEqual(48);
    expect(/^[A-Za-z0-9_-]+$/.test(pub.shareToken)).toBe(true);
    // Re-publishing keeps the same token.
    const repub = await storyService.publish(userIdA, s._id, true);
    expect(repub.shareToken).toBe(pub.shareToken);

    const unpub = await storyService.publish(userIdA, s._id, false);
    expect(unpub.isPublic).toBe(false);
    expect(unpub.shareToken).toBeNull();
    const reloaded = await Story.findById(s._id);
    expect(reloaded.isPublic).toBe(false);
    expect(reloaded.shareToken).toBeNull();
  });

  it('publish by another user → NotFoundError 404', async () => {
    const s = await storyService.create(userIdA, storyInput());
    await expect(storyService.publish(userIdB, s._id, true)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('getPublic(shareToken) returns projection without PII/versions/draftContent', async () => {
    const s = await storyService.create(userIdA, storyInput());
    const { shareToken } = await storyService.publish(userIdA, s._id, true);
    const ch = await Chapter.create({
      storyId: s._id,
      order: 1,
      content: 'public prose',
      title: 'One',
      summary: 's',
      isAIGenerated: true,
      draftContent: 'user draft that must not ship publicly',
    });
    ch.versions.push({
      version: 1,
      content: 'public prose',
      summary: 's',
      modifiedAt: new Date(),
      mode: 'ai',
    });
    await ch.save();

    const pub = await storyService.getPublic(shareToken);
    expect(pub).toBeTruthy();
    expect(pub.title).toBe('The Clockwork Heart');
    expect(pub).not.toHaveProperty('userId');
    expect(pub).not.toHaveProperty('versions');
    expect(pub.chapters).toBeTruthy();
    expect(pub.chapters[0]).not.toHaveProperty('versions');
    expect(pub.chapters[0]).not.toHaveProperty('draftContent');
    expect(pub.chapters[0].content).toBe('public prose');
    expect(pub.shareToken).toBe(shareToken);
  });

  it('getPublic returns null for invalid token, unowned/unpublished, token mismatch', async () => {
    expect(await storyService.getPublic('does-not-exist')).toBeNull();

    // Unpublished story — token null.
    const draft = await storyService.create(userIdA, storyInput());
    expect(await storyService.getPublic('A'.repeat(48))).toBeNull();

    // Published by A then unpublished → token cleared → null.
    const pub = await storyService.publish(userIdA, draft._id, true);
    await storyService.publish(userIdA, draft._id, false);
    expect(await storyService.getPublic(pub.shareToken)).toBeNull();

    // Story isPublic but a different (well-formed) token → null.
    const s2 = await storyService.create(userIdA, storyInput());
    await storyService.publish(userIdA, s2._id, true);
    expect(await storyService.getPublic('B'.repeat(48))).toBeNull();
  });

  it('computeWordCount(storyId) sums whitespace-split content lengths', async () => {
    const s = await storyService.create(userIdA, storyInput());
    await Chapter.create({
      storyId: s._id,
      order: 1,
      content: 'one two three',
      title: 'One',
      summary: '',
    });
    await Chapter.create({ storyId: s._id, order: 2, content: '', title: 'Two', summary: '' });
    await Chapter.create({
      storyId: s._id,
      order: 3,
      content: 'alpha beta',
      title: 'Three',
      summary: '',
    });

    expect(await storyService.computeWordCount(s._id)).toBe(5);

    const empty = await storyService.create(userIdA, storyInput());
    expect(await storyService.computeWordCount(empty._id)).toBe(0);
  });

  it('validateStructureAndStatus fails 404 when story is not owned', async () => {
    const s = await storyService.create(userIdA, storyInput());
    await expect(storyService.validateStructureAndStatus(userIdB, s._id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('validateStructureAndStatus passes for an owned story (Phase 5: existence/ownership only)', async () => {
    const s = await storyService.create(userIdA, storyInput());
    const result = await storyService.validateStructureAndStatus(userIdA, s._id);
    expect(result._id.toString()).toBe(s._id.toString());
  });
});
