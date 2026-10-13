import Story from '../models/Story.js';
import BranchNode from '../models/BranchNode.js';
import { AppError, NotFoundError, ConflictError } from '../utils/errors.js';

// StoryBuilder node service — Phase 9 branching (TICKET-71).
// CRUD + graph invariants (SPEC §1 BranchNode / §3.4): exactly one isStart per
// story; every non-start node has exactly one parentId; acyclic parent chains;
// isEnding nodes carry zero choices; non-ending scenes carry at least one choice
// (draft nodes — empty title/content — are exempt); max 6 choices per node;
// choice labels 2..80 chars; optimistic concurrency on content updates; delete
// cascades incoming choice edges (targetNodeId → null) or 409 HAS_CHILDREN.

const MUTABLE_FIELDS = ['title', 'content', 'summary', 'isEnding'];
const MAX_CHOICES = 6;

function pickNodeFields(input = {}) {
  const picked = {};
  for (const key of MUTABLE_FIELDS) {
    if (key in input) picked[key] = input[key];
  }
  return picked;
}

function assertNonEmptyPatch(patch) {
  if (Object.keys(patch).length === 0) {
    throw new AppError('VALIDATION_ERROR', 'No valid node fields to update.', 400);
  }
}

// Draft nodes (empty title and/or content) are exempt from the choice rule.
function isDraft(node) {
  return !node.title || !node.content;
}

function assertChoiceCompleteness(node) {
  if (node.isEnding && node.choices.length > 0) {
    throw new AppError('VALIDATION_ERROR', 'Ending nodes cannot have choices.', 400);
  }
  if (!node.isEnding && !isDraft(node) && node.choices.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Non-ending scenes must have at least one choice.', 400);
  }
}

async function requireOwnedStory(userId, storyId) {
  const story = await Story.findOne({ _id: storyId, userId }).lean().exec();
  if (!story) throw new NotFoundError('Story not found.');
  return story;
}

function assertBranching(story) {
  if (story.structureType !== 'branching') {
    throw new AppError('VALIDATION_ERROR', 'The story must be branching to have nodes.', 400);
  }
}

async function requireOwnedNode(userId, nodeId) {
  const node = await BranchNode.findOne({ _id: nodeId }).exec();
  if (!node) throw new NotFoundError('Branch node not found.');
  const story = await Story.findOne({ _id: node.storyId, userId }).lean().exec();
  if (!story) throw new NotFoundError('Branch node not found.');
  return { node, story };
}

// Walks the parent chain upward; revisiting any node means the chain is cyclic.
async function assertAcyclicParentChain(parent) {
  const seen = new Set();
  let current = parent;
  while (current) {
    const key = current._id.toString();
    if (seen.has(key)) {
      throw new AppError('CYCLIC_INVARIANT', 'A cyclic parent chain was detected.', 400);
    }
    seen.add(key);
    if (!current.parentId) break;
    current = await BranchNode.findById(current.parentId).exec();
  }
}

// Bumps the optimistic-concurrency version. Content mutations also push a
// ContentSnapshot (SPEC §1) capped at CONTENT_VERSION_RETENTION.
async function bumpVersion(node, { contentChanged = false } = {}) {
  const nextVersion = (node.version || 1) + 1;
  if (contentChanged) {
    const retention = Number(process.env.CONTENT_VERSION_RETENTION) || 10;
    const snapshots = node.versions || [];
    snapshots.push({
      version: nextVersion,
      content: node.content,
      summary: node.summary,
      modifiedAt: new Date(),
      mode: 'user',
    });
    node.versions = snapshots.slice(-retention);
  }
  node.version = nextVersion;
}

export async function list(userId, storyId) {
  const story = await requireOwnedStory(userId, storyId);
  assertBranching(story);
  const nodes = await BranchNode.find({ storyId }).sort({ createdAt: 1 }).lean().exec();
  const edges = [];
  for (const n of nodes) {
    if (n.parentId) {
      edges.push({ from: n.parentId.toString(), to: n._id.toString(), label: n.title || 'parent' });
    }
    for (const c of n.choices || []) {
      edges.push({
        from: n._id.toString(),
        to: c.targetNodeId ? c.targetNodeId.toString() : null,
        label: c.label,
        choiceId: c._id.toString(),
      });
    }
  }
  return { nodes, edges };
}

export async function create(userId, storyId, input = {}) {
  const story = await requireOwnedStory(userId, storyId);
  assertBranching(story);

  const parentId = input.parentId || null;
  let isStart = false;

  if (parentId) {
    const parent = await BranchNode.findOne({ _id: parentId, storyId }).exec();
    if (!parent) throw new NotFoundError('Parent branch node not found.');
    await assertAcyclicParentChain(parent);
  } else {
    const existing = await BranchNode.countDocuments({ storyId });
    if (existing === 0) {
      isStart = true;
    } else {
      throw new AppError(
        'VALIDATION_ERROR',
        'A non-start node requires exactly one parentId.',
        400,
      );
    }
  }

  const node = await BranchNode.create({
    storyId,
    parentId,
    isStart,
    version: 1,
    ...pickNodeFields(input),
  });
  return node;
}

export async function update(userId, nodeId, patch = {}, baseVersion) {
  const safe = pickNodeFields(patch);
  assertNonEmptyPatch(safe);
  const { node } = await requireOwnedNode(userId, nodeId);

  if (baseVersion !== undefined && baseVersion !== null) {
    if (baseVersion !== -1 && baseVersion !== node.version) {
      throw new ConflictError('This node was edited elsewhere. Reload to see the latest version.', [
        { field: 'version', message: `expected ${baseVersion}, got ${node.version}` },
      ]);
    }
    if (baseVersion === -1) {
      // eslint-disable-next-line no-param-reassign
      node.lostUpdate = true;
    }
  }

  if (safe.title !== undefined) node.title = safe.title;
  if (safe.content !== undefined) node.content = safe.content;
  if (safe.summary !== undefined) node.summary = safe.summary;
  if (safe.isEnding !== undefined) node.isEnding = Boolean(safe.isEnding);
  assertChoiceCompleteness(node);

  const contentChanged = 'content' in safe || 'summary' in safe;
  await bumpVersion(node, { contentChanged });
  await node.save();
  return node;
}

export async function remove(userId, nodeId, { cascade = true } = {}) {
  const { node } = await requireOwnedNode(userId, nodeId);

  const children = await BranchNode.find({ parentId: node._id, storyId: node.storyId })
    .select('_id')
    .lean()
    .exec();

  if (!cascade && children.length > 0) {
    throw new AppError(
      'HAS_CHILDREN',
      'Node has child nodes. Delete with cascade=1 to orphan them.',
      409,
    );
  }

  let orphanedChoices = 0;
  if (cascade) {
    // Count the edges that will be severed, then sever them in one atomic write
    // (the previous per-owner load→mutate→save loop raced with concurrent edits
    // and issued N writes).
    const owners = await BranchNode.find({
      storyId: node.storyId,
      'choices.targetNodeId': node._id,
    })
      .select('choices.targetNodeId')
      .lean()
      .exec();
    for (const owner of owners) {
      for (const c of owner.choices || []) {
        if (c.targetNodeId && c.targetNodeId.toString() === node._id.toString()) {
          orphanedChoices += 1;
        }
      }
    }
    if (orphanedChoices > 0) {
      await BranchNode.updateMany(
        { storyId: node.storyId, 'choices.targetNodeId': node._id },
        { $set: { 'choices.$[edge].targetNodeId': null } },
        { arrayFilters: [{ 'edge.targetNodeId': node._id }] },
      ).exec();
    }
  }

  await node.deleteOne();
  return { ok: true, orphanedChoices };
}

export async function addChoice(userId, nodeId, { label, targetNodeId = null } = {}) {
  const { node } = await requireOwnedNode(userId, nodeId);

  if (node.isEnding) {
    throw new AppError('VALIDATION_ERROR', 'Ending nodes cannot have choices.', 400);
  }
  if (node.choices.length >= MAX_CHOICES) {
    throw new AppError('VALIDATION_ERROR', `A node can have at most ${MAX_CHOICES} choices.`, 400);
  }
  const text = String(label || '').trim();
  if (text.length < 2 || text.length > 80) {
    throw new AppError('VALIDATION_ERROR', 'Choice label must be 2..80 characters.', 400);
  }
  if (targetNodeId) {
    const target = await BranchNode.findOne({
      _id: targetNodeId,
      storyId: node.storyId,
    }).exec();
    if (!target) throw new NotFoundError('Target branch node not found.');
  }

  node.choices.push({ label: text, targetNodeId });
  await bumpVersion(node);
  await node.save();
  return { choice: node.choices[node.choices.length - 1], node };
}

export async function removeChoice(userId, nodeId, choiceId) {
  const { node } = await requireOwnedNode(userId, nodeId);
  const idx = node.choices.findIndex((c) => c._id.toString() === String(choiceId));
  if (idx === -1) throw new NotFoundError('Choice not found.');

  if (!node.isEnding && node.choices.length === 1 && !isDraft(node)) {
    throw new AppError('VALIDATION_ERROR', 'Non-ending scenes must have at least one choice.', 400);
  }

  node.choices.splice(idx, 1);
  await bumpVersion(node);
  await node.save();
  return { ok: true };
}

// Aggregate word count across every branch node in a story. Linear stories
// compute this from chapters (storyService.computeWordCount); branching stories
// have no chapters, so the story's wordCount must sum node content instead.
export async function computeNodeWordCount(storyId) {
  const nodes = await BranchNode.find({ storyId }).select('content').lean().exec();
  return nodes.reduce((sum, n) => {
    const text = typeof n.content === 'string' ? n.content.trim() : '';
    return sum + (text ? text.split(/\s+/).length : 0);
  }, 0);
}

export default {
  list,
  create,
  update,
  remove,
  addChoice,
  removeChoice,
  computeNodeWordCount,
};
