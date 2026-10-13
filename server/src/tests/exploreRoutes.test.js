import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import Story from '../models/Story.js';

// Public explore/discovery catalog: GET /api/explore.
// Public-only projection, safe search, filters, pagination. No auth required.
describe('Explore routes — public catalog', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-explore';

  const owner = new mongoose.Types.ObjectId();

  function storyDoc(overrides = {}) {
    return {
      userId: owner,
      title: 'The Clockwork Heart',
      premise: 'A clockmaker discovers a living brass heart that can restore the dead.',
      pov: '3rd',
      structureType: 'single',
      generationMode: 'full-ai',
      isPublic: true,
      shareToken: `tok-${Math.random().toString(36).slice(2)}-${Date.now()}`,
      ...overrides,
    };
  }

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await Story.syncIndexes();
    await Story.deleteMany({});
    const app = await createApp(TEST_MONGO);
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;

    await Story.create([
      storyDoc({ title: 'Zenith Rising', genre: 'sci-fi', structureType: 'linear', wordCount: 900 }),
      storyDoc({ title: 'Whispers of Ash', genre: 'fantasy', structureType: 'branching', wordCount: 300 }),
      storyDoc({ title: 'Hidden Draft', genre: 'fantasy', isPublic: false, shareToken: null, wordCount: 5000 }),
    ]);
  });

  afterAll(async () => {
    if (server) server.close();
    await Story.deleteMany({});
    await mongoose.disconnect();
  });

  it('returns only published stories with a public projection', async () => {
    const res = await fetch(`${base}/api/explore`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.stories)).toBe(true);
    expect(body.total).toBe(2);
    expect(body.stories.every((s) => s.isPublic === true)).toBe(true);
    expect(body.stories.some((s) => s.title === 'Hidden Draft')).toBe(false);
    const first = body.stories[0];
    expect(first).not.toHaveProperty('userId');
    expect(first).not.toHaveProperty('characters');
    expect(first).not.toHaveProperty('versions');
    expect(first).toHaveProperty('premise');
    expect(first).toHaveProperty('shareToken');
  });

  it('search q matches title/premise case-insensitively', async () => {
    const res = await fetch(`${base}/api/explore?q=zenith`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stories.map((s) => s.title)).toEqual(['Zenith Rising']);
  });

  it('escapes regex metacharacters in q (no injection/ReDoS)', async () => {
    const res = await fetch(`${base}/api/explore?q=${encodeURIComponent('.*')}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stories).toHaveLength(0);
  });

  it('filters by genre and structureType', async () => {
    const fantasy = await (await fetch(`${base}/api/explore?genre=fantasy`)).json();
    expect(fantasy.stories.map((s) => s.title)).toEqual(['Whispers of Ash']);

    const linear = await (await fetch(`${base}/api/explore?structureType=linear`)).json();
    expect(linear.stories.map((s) => s.title)).toEqual(['Zenith Rising']);
  });

  it('paginates and reports hasMore', async () => {
    const page1 = await (await fetch(`${base}/api/explore?limit=1&page=1`)).json();
    expect(page1.stories).toHaveLength(1);
    expect(page1.total).toBe(2);
    expect(page1.hasMore).toBe(true);

    const page2 = await (await fetch(`${base}/api/explore?limit=1&page=2`)).json();
    expect(page2.stories).toHaveLength(1);
    expect(page2.hasMore).toBe(false);
  });

  it('sorts by most words', async () => {
    const res = await fetch(`${base}/api/explore?sort=words`);
    const body = await res.json();
    expect(body.stories[0].title).toBe('Zenith Rising');
  });

  it('invalid query params → 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${base}/api/explore?limit=9999`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
