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
    await expect(
      Character.create({ userId: new mongoose.Types.ObjectId() })
    ).rejects.toThrow();
  });

  it('requires userId', async () => {
    await expect(
      Character.create({ name: 'No Owner' })
    ).rejects.toThrow();
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
      })
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

  it('userId is indexed', async () => {
    const indexes = await Character.collection.indexes();
    const idx = indexes.find((i) => i.key && i.key.userId === 1);
    expect(idx).toBeTruthy();
  });
});