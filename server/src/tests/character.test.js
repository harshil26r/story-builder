import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import Character from '../models/Character.js';

// TICKET-32: Character model — valid create, required fields, enum + defaults,
// indexed userId.
describe('Character model (TICKET-32)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-character';

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await Character.syncIndexes();
  });

  afterAll(async () => {
    await Character.deleteMany({});
    await mongoose.disconnect();
  });

  it('create succeeds with valid fields — name, description, voiceStyle, role, avatarUrl, templateSource, timestamps', async () => {
    const userId = new mongoose.Types.ObjectId();
    const template = await Character.create({ userId, name: 'Template' });

    const c = await Character.create({
      userId,
      name: 'Elias Thorne',
      description: 'A clockmaker who winds time itself.',
      voiceStyle: 'measured, deliberate',
      role: 'protagonist',
      avatarUrl: 'https://example.com/elias.png',
      templateSource: template._id,
    });

    expect(c.name).toBe('Elias Thorne');
    expect(c.description).toBe('A clockmaker who winds time itself.');
    expect(c.voiceStyle).toBe('measured, deliberate');
    expect(c.role).toBe('protagonist');
    expect(c.avatarUrl).toBe('https://example.com/elias.png');
    expect(c.userId.toString()).toBe(userId.toString());
    expect(c.templateSource.toString()).toBe(template._id.toString());
    expect(c.createdAt).toBeInstanceOf(Date);
    expect(c.updatedAt).toBeInstanceOf(Date);
    await c.deleteOne();
    await template.deleteOne();
  });

  it('rejects a character missing name (ValidationError)', async () => {
    await expect(Character.create({ userId: new mongoose.Types.ObjectId() })).rejects.toThrow();
  });

  it('requires userId', async () => {
    await expect(Character.create({ name: 'No Owner' })).rejects.toThrow();
  });

  it('role defaults to neutral', async () => {
    const c = await Character.create({
      userId: new mongoose.Types.ObjectId(),
      name: 'Default Role',
    });
    expect(c.role).toBe('neutral');
    await c.deleteOne();
  });

  it('rejects an invalid role enum value', async () => {
    await expect(
      Character.create({
        userId: new mongoose.Types.ObjectId(),
        name: 'Bad Role',
        role: 'villain',
      }),
    ).rejects.toThrow();
  });

  it('avatarUrl defaults to null and templateSource defaults to null', async () => {
    const c = await Character.create({
      userId: new mongoose.Types.ObjectId(),
      name: 'No Extras',
    });
    expect(c.avatarUrl).toBeNull();
    expect(c.templateSource).toBeNull();
    await c.deleteOne();
  });

  it('persists the full SPEC character sheet (age, appearance, personality, …) and defaults the rest', async () => {
    const otherId = new mongoose.Types.ObjectId();
    const c = await Character.create({
      userId: new mongoose.Types.ObjectId(),
      name: 'Maven Kestrel',
      age: 32,
      gender: 'nonbinary',
      appearance: 'Silver hair, calm grey eyes.',
      personality: ['brave', 'quiet', 'curious'],
      likes: ['tea', 'harbor walks'],
      dislikes: ['liars', 'stormy sea'],
      habits: 'Whistles old shanties.',
      backstory: 'A lighthouse keeper who lost her family to the waves.',
      role: 'protagonist',
      relationships: [{ characterId: otherId, relationType: 'mentor' }],
      voiceStyle: 'measured',
      catchphrases: ['Time waits for no one.'],
      arc: 'Learns to trust again.',
      secretTrait: 'Can sense storms before they form.',
      secretRevealChapter: 7,
      isTemplate: false,
    });

    expect(c.age).toBe(32);
    expect(c.gender).toBe('nonbinary');
    expect(c.appearance).toBe('Silver hair, calm grey eyes.');
    expect(c.personality).toEqual(['brave', 'quiet', 'curious']);
    expect(c.likes).toEqual(['tea', 'harbor walks']);
    expect(c.dislikes).toEqual(['liars', 'stormy sea']);
    expect(c.habits).toBe('Whistles old shanties.');
    expect(c.backstory).toBe('A lighthouse keeper who lost her family to the waves.');
    expect(c.role).toBe('protagonist');
    expect(c.relationships).toHaveLength(1);
    expect(c.relationships[0].relationType).toBe('mentor');
    expect(c.relationships[0].characterId.toString()).toBe(otherId.toString());
    expect(c.voiceStyle).toBe('measured');
    expect(c.catchphrases).toEqual(['Time waits for no one.']);
    expect(c.arc).toBe('Learns to trust again.');
    expect(c.secretTrait).toBe('Can sense storms before they form.');
    expect(c.secretRevealChapter).toBe(7);
    expect(c.isTemplate).toBe(false);
    await c.deleteOne();
  });

  it('rich SPEC fields get safe defaults when omitted', async () => {
    const c = await Character.create({
      userId: new mongoose.Types.ObjectId(),
      name: 'Sparse',
    });
    expect(c.age).toBeNull();
    expect(c.gender).toBe('');
    expect(c.appearance).toBe('');
    expect(c.personality).toEqual([]);
    expect(c.likes).toEqual([]);
    expect(c.dislikes).toEqual([]);
    expect(c.habits).toBe('');
    expect(c.backstory).toBe('');
    expect(c.relationships).toEqual([]);
    expect(c.catchphrases).toEqual([]);
    expect(c.arc).toBe('');
    expect(c.secretTrait).toBe('');
    expect(c.secretRevealChapter).toBeNull();
    expect(c.isTemplate).toBe(false);
    await c.deleteOne();
  });

  it('userId is indexed', async () => {
    const indexes = await Character.collection.indexes();
    const idx = indexes.find((i) => i.key && i.key.userId === 1);
    expect(idx).toBeTruthy();
  });

  it('rejects more than 12 personality traits (array validator)', async () => {
    await expect(
      Character.create({
        userId: new mongoose.Types.ObjectId(),
        name: 'Too Many Traits',
        personality: Array.from({ length: 13 }, (_, i) => `trait-${i}`),
      }),
    ).rejects.toThrow(/personality/);
  });

  it('allows exactly 12 personality traits (boundary)', async () => {
    const c = await Character.create({
      userId: new mongoose.Types.ObjectId(),
      name: 'Exactly Twelve',
      personality: Array.from({ length: 12 }, (_, i) => `trait-${i}`),
    });
    expect(c.personality).toHaveLength(12);
    await c.deleteOne();
  });

  it('rejects more than 6 catchphrases', async () => {
    await expect(
      Character.create({
        userId: new mongoose.Types.ObjectId(),
        name: 'Chatty',
        catchphrases: Array.from({ length: 7 }, (_, i) => `phrase-${i}`),
      }),
    ).rejects.toThrow(/catchphrases/);
  });

  it('rejects more than 12 likes and more than 12 dislikes', async () => {
    const base = { userId: new mongoose.Types.ObjectId(), name: 'Preferential' };
    await expect(
      Character.create({ ...base, likes: Array.from({ length: 13 }, (_, i) => `like-${i}`) }),
    ).rejects.toThrow(/likes/);
    await expect(
      Character.create({ ...base, dislikes: Array.from({ length: 13 }, (_, i) => `dislike-${i}`) }),
    ).rejects.toThrow(/dislikes/);
  });

  it('allows the array maxima for likes, dislikes and catchphrases (boundary)', async () => {
    const c = await Character.create({
      userId: new mongoose.Types.ObjectId(),
      name: 'At The Limit',
      likes: Array.from({ length: 12 }, (_, i) => `like-${i}`),
      dislikes: Array.from({ length: 12 }, (_, i) => `dislike-${i}`),
      catchphrases: Array.from({ length: 6 }, (_, i) => `phrase-${i}`),
    });
    expect(c.likes).toHaveLength(12);
    expect(c.dislikes).toHaveLength(12);
    expect(c.catchphrases).toHaveLength(6);
    await c.deleteOne();
  });
});
