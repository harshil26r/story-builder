import Character from '../models/Character.js';
import { AppError, NotFoundError } from '../utils/errors.js';

// StoryBuilder character service — Phase 4 (Character CRUD).
// Every method is scoped to `userId`. Reading another user's character throws
// NotFoundError (404, never 403) per ACR-B-03 — no ownership leak.

// Fields a caller may set/update. Whitelist keeps the model's assert/validate
// surface narrow and prevents writes to system fields (userId, _id, timestamps).
const MUTABLE_FIELDS = ['name', 'description', 'voiceStyle', 'role', 'avatarUrl', 'templateSource'];

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

// Copies the template character's name/description/voiceStyle into the
// destination character `id`. Never mutates the source template. Both the
// destination and the template must be owned by `userId`.
export async function addCharacterCopyIn(userId, id, templateCharacterId) {
  const dest = await requireOwned(userId, id);
  const template = await requireOwned(userId, templateCharacterId);

  dest.name = template.name;
  dest.description = template.description;
  dest.voiceStyle = template.voiceStyle;
  await dest.save();

  return dest;
}

export default {
  list,
  get,
  create,
  update,
  remove,
  addCharacterCopyIn,
};