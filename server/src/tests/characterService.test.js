import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import Character from '../models/Character.js';
import characterService from '../services/characterService.js';

// TICKET-33: Character service — CRUD + ownership scoping + copy-in.
describe('characterService (TICKET-33)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-character-service';
  let userIdA;
  let userIdB;

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await Character.syncIndexes();
    userIdA = new mongoose.Types.ObjectId();
    userIdB = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await Character.deleteMany({});
    await mongoose.disconnect();
  });

  it('create(userId, input) creates and returns a Character scoped to userId', async () => {
    const c = await characterService.create(userIdA, {
      name: 'Elias',
      description: 'Clockmaker',
      voiceStyle: 'measured',
      role: 'protagonist',
    });
    expect(c).toBeTruthy();
    expect(c.name).toBe('Elias');
    expect(c.userId.toString()).toBe(userIdA.toString());
    expect(c.role).toBe('protagonist');
    expect(c._id).toBeTruthy();
  });

  it("list(userId) returns only that user's characters", async () => {
    await characterService.create(userIdA, { name: 'A1' });
    await characterService.create(userIdA, { name: 'A2' });
    await characterService.create(userIdB, { name: 'B1' });

    const forA = await characterService.list(userIdA);
    const forB = await characterService.list(userIdB);

    expect(forA.every((c) => c.userId.toString() === userIdA.toString())).toBe(true);
    expect(forA.length).toBeGreaterThanOrEqual(3);
    expect(forB.every((c) => c.userId.toString() === userIdB.toString())).toBe(true);
    expect(forB.length).toBe(1);
  });

  it("get(userId, id) returns the character; throws NotFoundError for another user's id", async () => {
    const mine = await characterService.create(userIdA, { name: 'Mine' });
    const fetched = await characterService.get(userIdA, mine._id);
    expect(fetched._id.toString()).toBe(mine._id.toString());

    await expect(characterService.get(userIdB, mine._id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('get(userId, id) throws NotFoundError for a nonexistent id', async () => {
    await expect(
      characterService.get(userIdA, new mongoose.Types.ObjectId())
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('update(userId, id, patch) updates and returns; wrong user → NotFoundError (not 403)', async () => {
    const c = await characterService.create(userIdA, { name: 'Before', description: 'old' });
    const updated = await characterService.update(userIdA, c._id, {
      name: 'After',
      description: 'new desc',
      role: 'supporting',
    });
    expect(updated.name).toBe('After');
    expect(updated.description).toBe('new desc');
    expect(updated.role).toBe('supporting');

    const reloaded = await Character.findById(c._id);
    expect(reloaded.name).toBe('After');

    await expect(
      characterService.update(userIdB, c._id, { name: 'Hacked' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('remove(userId, id) deletes; wrong user → NotFoundError (not 403)', async () => {
    const c = await characterService.create(userIdA, { name: 'Doomed' });
    await characterService.remove(userIdA, c._id);
    const gone = await Character.findById(c._id);
    expect(gone).toBeNull();

    const c2 = await characterService.create(userIdA, { name: 'Protected' });
    await expect(characterService.remove(userIdB, c2._id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    const still = await Character.findById(c2._id);
    expect(still).toBeTruthy();
  });

  it('empty patch → update throws AppError (validation)', async () => {
    const c = await characterService.create(userIdA, { name: 'No Patch' });
    await expect(
      characterService.update(userIdA, c._id, {})
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('addCharacterCopyIn copies template fields into the destination character without mutating the source', async () => {
    const template = await characterService.create(userIdA, {
      name: 'Master Template',
      description: 'A reusable archetype.',
      voiceStyle: 'gravelly',
      role: 'antagonist',
    });
    const dest = await characterService.create(userIdA, {
      name: 'Blank Target',
      description: '',
      voiceStyle: '',
    });

    const copy = await characterService.addCharacterCopyIn(userIdA, dest._id, template._id);

    expect(copy._id.toString()).toBe(dest._id.toString());
    expect(copy.name).toBe('Master Template');
    expect(copy.description).toBe('A reusable archetype.');
    expect(copy.voiceStyle).toBe('gravelly');
    expect(copy.userId.toString()).toBe(userIdA.toString());

    const sourceReloaded = await Character.findById(template._id);
    expect(sourceReloaded.name).toBe('Master Template');
    expect(sourceReloaded.description).toBe('A reusable archetype.');
    expect(sourceReloaded.voiceStyle).toBe('gravelly');
  });

  it('addCharacterCopyIn throws NotFoundError when the template does not exist', async () => {
    const dest = await characterService.create(userIdA, { name: 'Target' });
    await expect(
      characterService.addCharacterCopyIn(userIdA, dest._id, new mongoose.Types.ObjectId())
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('addCharacterCopyIn ownership: template from another user → NotFoundError', async () => {
    const templateB = await characterService.create(userIdB, {
      name: 'B Template',
      description: 'belongs to B',
    });
    const dest = await characterService.create(userIdA, { name: 'A Target' });
    await expect(
      characterService.addCharacterCopyIn(userIdA, dest._id, templateB._id)
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('addCharacterCopyIn ownership: destination from another user → NotFoundError', async () => {
    const template = await characterService.create(userIdA, {
      name: 'A Template',
      description: 'belongs to A',
    });
    const destB = await characterService.create(userIdB, { name: 'B Target' });
    await expect(
      characterService.addCharacterCopyIn(userIdB, destB._id, template._id)
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});