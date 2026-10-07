import crypto from 'crypto';
import mongoose from 'mongoose';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';
// BranchNode lands in Phase 9; delete cascades chapters only for now.
import { AppError, NotFoundError, ConflictError } from '../utils/errors.js';

// StoryBuilder story service — Phase 5 (TICKET-42).
// Every method is scoped to `userId`. Reading another user's story throws
// NotFoundError (404, never 403) — no ownership leak (ACR-B-03 pattern).

// Default fiction/AI disclaimer stamped at create (SPEC §1 `disclaimerText`).
const DEFAULT_DISCLAIMER =
  'This is a work of fiction. Names, characters, businesses, places, events, ' +
  'and incidents are either the products of the author’s imagination or ' +
  'used in a fictitious manner. AI-assisted storytelling was used in creating ' +
  'this work.';

// Fields a caller may set/update. Whitelist keeps the model's validate surface
// narrow and prevents writes to system fields (userId, _id, timestamps,
// version, wordCount, totalChapters...). `characters` accepts raw ObjectIds.
const MUTABLE_FIELDS = [
  'title',
  'premise',
  'genre',
  'tone',
  'targetAudience',
  'lengthTarget',
  'pov',
  'structureType',
  'generationMode',
  'characters',
  'coverImageUrl',
  'disclaimerText',
  'status',
  'isPublic',
];

function pickStoryFields(input = {}) {
  const picked = {};
  for (const key of MUTABLE_FIELDS) {
    if (key in input) picked[key] = input[key];
  }
  return picked;
}

function normalizeCharacterIds(ids) {
  return (ids || []).map((x) => (typeof x === 'string' ? new mongoose.Types.ObjectId(x) : x));
}

function assertNonEmptyPatch(patch) {
  if (Object.keys(patch).length === 0) {
    throw new AppError('VALIDATION_ERROR', 'No valid story fields to update.', 400);
  }
}

async function requireOwned(userId, id) {
  const story = await Story.findOne({ _id: id, userId });
  if (!story) {
    throw new NotFoundError('Story not found.');
  }
  return story;
}

// Attach chapters (single/linear) or nodes (branching; Phase 9 model) and
// optionally version snapshots. Returns a plain object serialization.
async function loadExpanded(story, { withVersions = false } = {}) {
  const obj = story.toObject ? story.toObject() : story;

  if (story.structureType === 'branching') {
    let nodes = [];
    try {
      const { BranchNode } = await import('../models/BranchNode.js');
      nodes = await BranchNode.find({ storyId: story._id }).sort({ createdAt: 1 }).lean().exec();
      if (!withVersions) {
        nodes = nodes.map(({ versions: _v, ...rest }) => rest);
      }
    } catch {
      // BranchNode model not compiled yet (Phase 9) — no nodes to attach.
      nodes = [];
    }
    return { ...obj, nodes };
  }

  const chapters = await Chapter.find({ storyId: story._id }).sort({ order: 1 }).lean().exec();
  const cleaned = withVersions ? chapters : chapters.map(({ versions: _v, ...rest }) => rest);

  return { ...obj, chapters: cleaned };
}

// ── Exported service ─────────────────────────────────────────────────────────

export async function list(userId) {
  const stories = await Story.find({ userId })
    .sort({ updatedAt: -1 })
    .select(
      '-characters -premise -genre -tone -targetAudience -lengthTarget -pov ' +
        '-generationMode -disclaimerText -shareToken -version -createdAt',
    )
    .lean()
    .exec();
  // StorySummary contract — updatedAt is an ISO string.
  return stories.map((s) => ({ ...s, updatedAt: s.updatedAt.toISOString() }));
}

export async function create(userId, input = {}) {
  const picked = pickStoryFields(input);
  // `characterIds` is the API/validation name; domain stores `characters`.
  // Explicitly copy the request's characterIds into story.characters.
  if (Array.isArray(input.characterIds)) {
    picked.characters = normalizeCharacterIds(input.characterIds);
  } else if (Array.isArray(picked.characters)) {
    picked.characters = normalizeCharacterIds(picked.characters);
  }
  const story = await Story.create({
    userId,
    ...picked,
    status: 'draft',
    version: 1,
    disclaimerText: input.disclaimerText || DEFAULT_DISCLAIMER,
  });
  return story;
}

export async function get(userId, id, { withVersions = false } = {}) {
  const story = await requireOwned(userId, id);
  return loadExpanded(story, { withVersions });
}

export async function update(userId, id, patch = {}, baseVersion) {
  const safe = pickStoryFields(patch);
  assertNonEmptyPatch(safe);

  // API/validation name is `characterIds`; domain stores `characters`.
  if (Array.isArray(patch.characterIds)) {
    safe.characters = normalizeCharacterIds(patch.characterIds);
  } else if (Array.isArray(safe.characters)) {
    safe.characters = normalizeCharacterIds(safe.characters);
  }

  const story = await requireOwned(userId, id);

  // Optimistic concurrency (SPEC §3.6). `-1` = force overwrite.
  if (baseVersion !== undefined && baseVersion !== null) {
    if (baseVersion !== -1 && baseVersion !== story.version) {
      throw new ConflictError(
        'This story was edited elsewhere. Reload to see the latest version.',
        [{ field: 'version', message: `expected ${baseVersion}, got ${story.version}` }],
      );
    }
    if (baseVersion === -1) {
      // Force write wins; flag the response so the client shows "lost update".
      // eslint-disable-next-line no-param-reassign
      story.lostUpdate = true;
    }
  }

  Object.assign(story, safe);
  // Every mutation bumps the optimistic-concurrency version.
  story.version = (story.version || 1) + 1;
  await story.save();

  // Return the expanded story (chapters/nodes by structureType) so GET/PUT
  // shapes stay consistent. Non-schema flag survives on the returned object.
  const expanded = await loadExpanded(story);
  if (story.lostUpdate) expanded.lostUpdate = true;
  return expanded;
}

export async function remove(userId, id) {
  const story = await requireOwned(userId, id);
  await Chapter.deleteMany({ storyId: story._id });
  // Phase 9 registers BranchNode; cascade nodes there when it exists.
  try {
    const { BranchNode } = await import('../models/BranchNode.js');
    await BranchNode.deleteMany({ storyId: story._id });
  } catch {
    // Model not compiled yet — nothing to cascade.
  }
  await story.deleteOne();
  return { ok: true };
}

export async function publish(userId, id, isPublic) {
  const story = await requireOwned(userId, id);
  if (isPublic && !story.shareToken) {
    story.shareToken = crypto.randomBytes(36).toString('base64url'); // 48 chars
  } else if (!isPublic) {
    story.shareToken = null;
  }
  story.isPublic = Boolean(isPublic);
  // Publishing is a mutation of the publishable surface — bump version.
  story.version = (story.version || 1) + 1;
  await story.save();
  return { isPublic: story.isPublic, shareToken: story.shareToken || null };
}

export async function getPublic(shareToken) {
  const story = await Story.findOne({ shareToken, isPublic: true }).lean().exec();
  if (!story) return null;

  const chapters = await Chapter.find({ storyId: story._id })
    .sort({ order: 1 })
    .select('-versions -draftContent')
    .lean()
    .exec();
  let nodes = null;
  if (story.structureType === 'branching') {
    try {
      const { BranchNode } = await import('../models/BranchNode.js');
      nodes = await BranchNode.find({ storyId: story._id })
        .sort({ createdAt: 1 })
        .select('-versions')
        .lean()
        .exec();
    } catch {
      nodes = [];
    }
  }

  // Public projection — no user PII, no version snapshots, no draftContent,
  // no character refs (copied-in template ids are internal).
  const { userId, versions, draftContent, characters, ...rest } = story;
  return {
    ...rest,
    ...(story.structureType === 'branching' ? { nodes } : { chapters }),
  };
}

export async function computeWordCount(storyId) {
  const chapters = await Chapter.find({ storyId }).select('content').lean().exec();
  return chapters.reduce(
    (sum, ch) =>
      sum +
      (typeof ch.content === 'string' && ch.content.trim()
        ? ch.content.trim().split(/\s+/).length
        : 0),
    0,
  );
}

// Copies the given character template refs into story.characters.
// Never mutates the source templates — they are untouched; only the story's
// `characters` array (copied-in refs) is extended.
export async function addCharactersCopyIn(userId, id, characterIds) {
  const story = await requireOwned(userId, id);
  const incoming = normalizeCharacterIds(characterIds).map((x) => x.toString());
  const existing = new Set((story.characters || []).map((x) => x.toString()));
  for (const charId of incoming) {
    if (!existing.has(charId)) {
      story.characters.push(new mongoose.Types.ObjectId(charId));
      existing.add(charId);
    }
  }
  // Copy-in mutates the story — bump version.
  story.version = (story.version || 1) + 1;
  await story.save();
  return story;
}

// Phase 5: existence + ownership only. Deeper structure/status validation for
// regenerate/continue arrives in Phase 6.
export async function validateStructureAndStatus(userId, id) {
  return requireOwned(userId, id);
}

// TICKET-55: append a content version snapshot to a chapter. The next version is
// always `max retained + 1` so `doc.version === max(versions[].version)` even
// after the retention cap (ACR-B-13, ACR-B-04) drops the oldest snapshot.
// `mode` records the origin of the text: 'ai' (generated) or 'user' (draft edit).
export async function saveChapterVersion({ chapterId, content, summary, mode = 'ai' }) {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw new NotFoundError('Chapter not found.');
  const retention = Number(process.env.CONTENT_VERSION_RETENTION) || 10;
  const retained = chapter.versions || [];
  const nextVersion = retained.length ? retained[retained.length - 1].version + 1 : 1;
  const snapshots = [...retained];
  snapshots.push({ version: nextVersion, content, summary, modifiedAt: new Date(), mode });
  chapter.versions = snapshots.slice(-retention);
  chapter.version = nextVersion;
  chapter.content = content;
  chapter.summary = summary;
  await chapter.save();
  return chapter;
}

// TICKET-58: persist edited chapter content from the StoryEditor autosave.
// Ownership + chapter-membership verified (404, never 403). Optimistic
// concurrency on chapter.version (409 CONFLICT). Bumps version, snapshots the
// text (mode 'user'), mirrors content into draftContent (ai-enhanced original
// draft) and recomputes the story's aggregate word count.
export async function saveChapter(
  userId,
  storyId,
  chapterId,
  { content, summary } = {},
  baseVersion,
) {
  const story = await Story.findOne({ _id: storyId, userId });
  if (!story) throw new NotFoundError('Story not found.');

  const chapter = await Chapter.findOne({ _id: chapterId, storyId });
  if (!chapter) throw new NotFoundError('Chapter not found.');

  // Optimistic concurrency (SPEC §3.6). `-1` = force overwrite.
  if (baseVersion !== undefined && baseVersion !== null) {
    if (baseVersion !== -1 && baseVersion !== chapter.version) {
      throw new ConflictError(
        'This chapter was edited elsewhere. Reload to see the latest version.',
        [{ field: 'version', message: `expected ${baseVersion}, got ${chapter.version}` }],
      );
    }
  }

  const newContent = content !== undefined ? content : chapter.content;
  const newSummary = summary !== undefined ? summary : chapter.summary;

  const retained = chapter.versions || [];
  const nextVersion = retained.length
    ? retained[retained.length - 1].version + 1
    : (chapter.version || 0) + 1;
  chapter.versions = [
    ...retained,
    {
      version: nextVersion,
      content: newContent,
      summary: newSummary,
      modifiedAt: new Date(),
      mode: 'user',
    },
  ].slice(-(Number(process.env.CONTENT_VERSION_RETENTION) || 10));
  chapter.version = nextVersion;
  chapter.content = newContent;
  chapter.summary = newSummary;
  if (chapter.draftContent) chapter.draftContent = newContent;
  await chapter.save();

  story.wordCount = await computeWordCount(storyId);
  await story.save();

  return chapter.toObject ? chapter.toObject() : chapter;
}

export default {
  list,
  create,
  get,
  update,
  remove,
  publish,
  getPublic,
  computeWordCount,
  addCharactersCopyIn,
  validateStructureAndStatus,
  saveChapterVersion,
  saveChapter,
};
