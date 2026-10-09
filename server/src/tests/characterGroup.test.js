import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import CharacterGroup from '../models/CharacterGroup.js';

// TICKET: CharacterGroup model — named, user-scoped groups for characters.
// A character can belong to many groups; a group holds many characters.
describe('CharacterGroup model', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-character-group';

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await CharacterGroup.syncIndexes();
  });

  afterAll(async () => {
    await CharacterGroup.deleteMany({});
    await mongoose.disconnect();
  });

  it('creates a group with userId + trimmed name', async () => {
    const g = await CharacterGroup.create({
      userId: new mongoose.Types.ObjectId(),
      name: '  Villains  ',
    });
    expect(g.name).toBe('Villains');
    expect(g.userId).toBeTruthy();
    expect(g.createdAt).toBeInstanceOf(Date);
    expect(g.updatedAt).toBeInstanceOf(Date);
    await g.deleteOne();
  });

  it('requires userId and name', async () => {
    await expect(CharacterGroup.create({ name: 'No Owner' })).rejects.toThrow();
    await expect(
      CharacterGroup.create({ userId: new mongoose.Types.ObjectId() }),
    ).rejects.toThrow();
  });

  it('enforces name max length', async () => {
    await expect(
      CharacterGroup.create({
        userId: new mongoose.Types.ObjectId(),
        name: 'x'.repeat(81),
      }),
    ).rejects.toThrow();
  });

  it('rejects duplicate group names for the same user; allows across users', async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    await CharacterGroup.create({ userId: userA, name: 'Book 1' });
    await expect(CharacterGroup.create({ userId: userA, name: 'Book 1' })).rejects.toThrow();

    const other = await CharacterGroup.create({ userId: userB, name: 'Book 1' });
    expect(other.name).toBe('Book 1');
    await other.deleteOne();
    await CharacterGroup.deleteMany({});
  });
});
