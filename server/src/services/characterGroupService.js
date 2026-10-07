import CharacterGroup from '../models/CharacterGroup.js';
import Character from '../models/Character.js';
import { AppError, NotFoundError } from '../utils/errors.js';

// StoryBuilder character-group service — scoped, named groups that hold
// characters (many-to-many via Character.groupIds). Every method is scoped to
// `userId`; another user's group resolves to NotFoundError (404, never 403) per
// ACR-B-03.

async function requireOwned(userId, id) {
  const group = await CharacterGroup.findOne({ _id: id, userId });
  if (!group) {
    throw new NotFoundError('Character group not found.');
  }
  return group;
}

function assertUniqueName(err, name) {
  if (err && err.code === 11000) {
    throw new AppError('CONFLICT', `A character group named "${name}" already exists.`, 409);
  }
  throw err;
}

export async function list(userId) {
  return CharacterGroup.find({ userId }).sort({ name: 1 });
}

export async function create(userId, name) {
  try {
    return await CharacterGroup.create({ userId, name });
  } catch (err) {
    assertUniqueName(err, name);
  }
}

export async function update(userId, id, name) {
  const group = await requireOwned(userId, id);
  group.name = name;
  try {
    await group.save();
  } catch (err) {
    assertUniqueName(err, name);
  }
  return group;
}

export async function remove(userId, id) {
  const group = await requireOwned(userId, id);
  await group.deleteOne();
  await Character.updateMany({ userId, groupIds: id }, { $pull: { groupIds: id } });
  return { ok: true };
}

export default { list, create, update, remove };
