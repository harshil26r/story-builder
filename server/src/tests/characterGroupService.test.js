import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import Character from '../models/Character.js';
import CharacterGroup from '../models/CharacterGroup.js';
import characterGroupService from '../services/characterGroupService.js';

// TICKET: CharacterGroup service — scoped CRUD + cleanup on delete.
describe('characterGroupService', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-character-group-service';
  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await Character.syncIndexes();
    await CharacterGroup.syncIndexes();
  });

  afterAll(async () => {
    await Character.deleteMany({});
    await CharacterGroup.deleteMany({});
    await mongoose.disconnect();
  });

  it('create + list are scoped to the user', async () => {
    await characterGroupService.create(userA, 'Villains');
    await characterGroupService.create(userA, 'Book 1');
    await characterGroupService.create(userB, 'Villains');

    const forA = await characterGroupService.list(userA);
    const forB = await characterGroupService.list(userB);

    expect(forA.map((g) => g.name).sort()).toEqual(['Book 1', 'Villains']);
    expect(forB.map((g) => g.name)).toEqual(['Villains']);
  });

  it('create rejects a duplicate name for the same user with ConflictError', async () => {
    await expect(characterGroupService.create(userA, 'Book 1')).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
    });
  });

  it('update renames an owned group; missing group → NotFoundError', async () => {
    const g = await characterGroupService.create(userA, 'Rename Me');
    const renamed = await characterGroupService.update(userA, g._id, 'Final Draft');
    expect(renamed.name).toBe('Final Draft');

    await expect(characterGroupService.update(userB, g._id, 'Hacked')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('remove deletes the group and pulls it off owned characters', async () => {
    const g = await characterGroupService.create(userA, 'Doomed Cast');
    const char = await Character.create({ userId: userA, name: 'Maven', groupIds: [g._id] });

    await characterGroupService.remove(userA, g._id);

    const gone = await CharacterGroup.findById(g._id);
    expect(gone).toBeNull();
    const reloaded = await Character.findById(char._id);
    expect(reloaded.groupIds).toHaveLength(0);
  });

  it('remove on a group owned by another user → NotFoundError and nothing deleted', async () => {
    const g = await characterGroupService.create(userB, 'B Cast');
    await expect(characterGroupService.remove(userA, g._id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    const still = await CharacterGroup.findById(g._id);
    expect(still).toBeTruthy();
  });
});
