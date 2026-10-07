import Character from '../models/Character.js';
import CharacterGroup from '../models/CharacterGroup.js';
import { AppError, NotFoundError } from '../utils/errors.js';

// StoryBuilder character service — Phase 4 (Character CRUD).
// Every method is scoped to `userId`. Reading another user's character throws
// NotFoundError (404, never 403) per ACR-B-03 — no ownership leak.

// Fields a caller may set/update. Whitelist keeps the model's assert/validate
// surface narrow and prevents writes to system fields (userId, _id, timestamps).
// Mirrors the SPEC §2.3 CharacterInput sheet.
const MUTABLE_FIELDS = [
  'name',
  'description',
  'age',
  'gender',
  'appearance',
  'personality',
  'likes',
  'dislikes',
  'habits',
  'backstory',
  'role',
  'avatarUrl',
  'relationships',
  'voiceStyle',
  'catchphrases',
  'arc',
  'secretTrait',
  'secretRevealChapter',
  'isTemplate',
  'templateSource',
];

function pickCharacterFields(input = {}) {
  const picked = {};
  for (const key of MUTABLE_FIELDS) {
    if (key in input) picked[key] = input[key];
  }
  return picked;
}

function assertNonEmptyPatch(patch) {
  if (Object.keys(patch).length === 0) {
    throw new AppError('VALIDATION_ERROR', 'No valid character fields to update.', 400);
  }
}

async function requireOwned(userId, id) {
  const character = await Character.findOne({ _id: id, userId });
  if (!character) {
    throw new NotFoundError('Character not found.');
  }
  return character;
}

export async function list(userId) {
  return Character.find({ userId }).sort({ createdAt: -1 });
}

export async function get(userId, id) {
  return requireOwned(userId, id);
}

export async function create(userId, input = {}) {
  return Character.create({ userId, ...pickCharacterFields(input) });
}

export async function update(userId, id, patch = {}) {
  const safe = pickCharacterFields(patch);
  assertNonEmptyPatch(safe);
  const character = await requireOwned(userId, id);
  Object.assign(character, safe);
  await character.save();
  return character;
}

export async function remove(userId, id) {
  const character = await requireOwned(userId, id);
  await character.deleteOne();
  return { ok: true };
}

// Replaces a character's group membership. Every referenced group must belong
// to `userId` (404 NOT_FOUND if any group is missing or foreign). Duplicates
// are rejected so `groupIds` stays a set.
export async function setGroups(userId, id, groupIds = []) {
  const character = await requireOwned(userId, id);
  const ids = groupIds.map((g) => g.toString());
  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) {
    throw new AppError('VALIDATION_ERROR', 'Group ids must be unique.', 400);
  }

  if (unique.length > 0) {
    const owned = await CharacterGroup.find({ _id: { $in: unique }, userId }).select('_id');
    const ownedSet = new Set(owned.map((g) => g._id.toString()));
    const missing = unique.find((groupId) => !ownedSet.has(groupId));
    if (missing) {
      throw new NotFoundError('Character group not found.');
    }
  }

  character.groupIds = unique;
  await character.save();
  return character;
}

// Copies the template character's full sheet into the destination character
// `id`. Never mutates the source template. Both the destination and the
// template must be owned by `userId`. The destination keeps its own avatar and
// templateSource wiring (only persona fields are overwritten).
const COPY_IN_FIELDS = MUTABLE_FIELDS.filter(
  (f) => !['avatarUrl', 'templateSource', 'isTemplate'].includes(f),
);

export async function addCharacterCopyIn(userId, id, templateCharacterId) {
  const dest = await requireOwned(userId, id);
  const template = await requireOwned(userId, templateCharacterId);

  for (const field of COPY_IN_FIELDS) {
    dest[field] = template[field];
  }
  await dest.save();

  return dest;
}

export default {
  list,
  get,
  create,
  update,
  remove,
  setGroups,
  addCharacterCopyIn,
};
