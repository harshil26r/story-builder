import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import Story from '../models/Story.js';
import BranchNode from '../models/BranchNode.js';
import nodeService from '../services/nodeService.js';
import { AppError } from '../utils/errors.js';

// TICKET-71: node service graph invariants — first node isStart, parentId rule,
// cycle detection, choice completeness + cap, orphan cascade / HAS_CHILDREN,
// optimistic concurrency on content updates.
describe('nodeService (TICKET-71)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-node-service';
  const userId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await Story.syncIndexes();
    await BranchNode.syncIndexes();
  });

  afterAll(async () => {
    await BranchNode.deleteMany({});
    await Story.deleteMany({});
    await mongoose.disconnect();
  });

  async function branchingStory(title = 'Branch Tale') {
    return Story.create({
      userId,
      title,
      premise: 'A door that opens onto every path not taken.',
      pov: '3rd',
      structureType: 'branching',
      generationMode: 'full-ai',
      characterIds: [],
    });
  }

  async function linearStory(title = 'Linear Tale') {
    return Story.create({
      userId,
      title,
      premise: 'A straight road with a single destination.',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
      characterIds: [],
    });
  }

  function expectAppError(promise, code, status) {
    return expect(promise).rejects.toMatchObject({
      name: 'AppError',
      code,
      status,
    });
  }

  it('first node in a branching story auto-sets isStart:true', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, {
      title: 'The Gate',
      content: 'You stand before the gate.',
    });
    expect(node.isStart).toBe(true);
    expect(node.parentId).toBeNull();
    expect(node.version).toBe(1);
  });

  it('create on a non-branching story → 400 VALIDATION_ERROR', async () => {
    const story = await linearStory();
    await expectAppError(
      nodeService.create(userId, story._id, { title: 'nope' }),
      'VALIDATION_ERROR',
      400,
    );
  });

  it('second node without parentId → 400 VALIDATION_ERROR', async () => {
    const story = await branchingStory();
    await nodeService.create(userId, story._id, { title: 'Root', content: 'a' });
    await expectAppError(
      nodeService.create(userId, story._id, { title: 'Rootless', content: 'b' }),
      'VALIDATION_ERROR',
      400,
    );
  });

  it('child node creation via parentId sets parentId and isStart:false', async () => {
    const story = await branchingStory();
    const parent = await nodeService.create(userId, story._id, {
      title: 'Root',
      content: 'a',
    });
    const child = await nodeService.create(userId, story._id, {
      parentId: parent._id,
      title: 'Branch',
      content: 'b',
    });
    expect(child.isStart).toBe(false);
    expect(child.parentId.toString()).toBe(parent._id.toString());
  });

  it('create with unknown parent → 404 NOT_FOUND', async () => {
    const story = await branchingStory();
    await expectAppError(
      nodeService.create(userId, story._id, {
        parentId: new mongoose.Types.ObjectId(),
        title: 'Ghost Parent',
      }),
      'NOT_FOUND',
      404,
    );
  });

  it('create with a parent from another story → 404 NOT_FOUND', async () => {
    const storyA = await branchingStory('A');
    const storyB = await branchingStory('B');
    const parentA = await nodeService.create(userId, storyA._id, { title: 'A Root' });
    await expectAppError(
      nodeService.create(userId, storyB._id, {
        parentId: parentA._id,
        title: 'Cross Story',
      }),
      'NOT_FOUND',
      404,
    );
  });

  it('cycle in parent chain (self-loop) → 400 CYCLIC_INVARIANT', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, { title: 'Loopy', content: 'x' });
    node.parentId = node._id; // simulate corrupted data forming a cycle
    await node.save();

    await expectAppError(
      nodeService.create(userId, story._id, { parentId: node._id, title: 'Child' }),
      'CYCLIC_INVARIANT',
      400,
    );
  });

  it('addChoice adds a labeled choice with _id and targetNodeId', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, { title: 'Crossroads', content: 'c' });
    const { choice } = await nodeService.addChoice(userId, node._id, {
      label: 'Descend into the crypt',
    });
    expect(choice._id).toBeTruthy();
    expect(choice.label).toBe('Descend into the crypt');
    expect(choice.targetNodeId).toBeNull();
  });

  it('addChoice rejects a 1-char label → 400 VALIDATION_ERROR', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, { title: 'Road', content: 'r' });
    await expectAppError(
      nodeService.addChoice(userId, node._id, { label: 'x' }),
      'VALIDATION_ERROR',
      400,
    );
  });

  it('addChoice caps at 6 choices → 400 VALIDATION_ERROR', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, { title: 'Many Doors', content: 'm' });
    for (let i = 0; i < 6; i += 1) {
      await nodeService.addChoice(userId, node._id, { label: `Door ${i + 1}` });
    }
    await expectAppError(
      nodeService.addChoice(userId, node._id, { label: 'Door 7' }),
      'VALIDATION_ERROR',
      400,
    );
  });

  it('addChoice on an isEnding node → 400 VALIDATION_ERROR', async () => {
    const story = await branchingStory();
    const end = await nodeService.create(userId, story._id, {
      title: 'The End',
      content: 'Fin.',
      isEnding: true,
    });
    await expectAppError(
      nodeService.addChoice(userId, end._id, { label: 'Keep going' }),
      'VALIDATION_ERROR',
      400,
    );
  });

  it('addChoice with a target from another story → 404 NOT_FOUND', async () => {
    const story = await branchingStory();
    const other = await branchingStory('Other');
    const node = await nodeService.create(userId, story._id, { title: 'A', content: 'a' });
    const otherNode = await nodeService.create(userId, other._id, { title: 'B', content: 'b' });
    await expectAppError(
      nodeService.addChoice(userId, node._id, {
        label: 'Wrong target',
        targetNodeId: otherNode._id,
      }),
      'NOT_FOUND',
      404,
    );
  });

  it('removeChoice removes the choice', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, { title: 'One Door', content: '1' });
    const { choice } = await nodeService.addChoice(userId, node._id, { label: 'Open it' });
    await nodeService.addChoice(userId, node._id, { label: 'Leave it' });

    const { ok } = await nodeService.removeChoice(userId, node._id, choice._id);
    expect(ok).toBe(true);
    const fresh = await BranchNode.findById(node._id);
    expect(fresh.choices).toHaveLength(1);
  });

  it('removeChoice on a non-ending scene with content (last choice) → 400', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, {
      title: 'Scene',
      content: 'full scene',
    });
    const { choice } = await nodeService.addChoice(userId, node._id, { label: 'Only way' });
    await expectAppError(
      nodeService.removeChoice(userId, node._id, choice._id),
      'VALIDATION_ERROR',
      400,
    );
  });

  it('removeChoice on a draft node (no content) is allowed → ok', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, { title: 'Draft' });
    const { choice } = await nodeService.addChoice(userId, node._id, { label: 'Draft choice' });
    const { ok } = await nodeService.removeChoice(userId, node._id, choice._id);
    expect(ok).toBe(true);
  });

  it('update content with matching baseVersion bumps version and pushes snapshot', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, { title: 'V1', content: 'old' });
    await nodeService.addChoice(userId, node._id, { label: 'Go' });
    const fresh = await BranchNode.findById(node._id);

    const updated = await nodeService.update(
      userId,
      node._id,
      { content: 'new text' },
      fresh.version,
    );
    expect(updated.version).toBe(fresh.version + 1);
    expect(updated.content).toBe('new text');
    expect(updated.versions).toHaveLength(1);
    expect(updated.versions[0].version).toBe(updated.version);
    expect(updated.versions[0].mode).toBe('user');
  });

  it('update with stale baseVersion → 409 CONFLICT + fields', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, { title: 'Race', content: 'a' });
    await nodeService.addChoice(userId, node._id, { label: 'On' });
    const fresh = await BranchNode.findById(node._id);
    await nodeService.update(userId, node._id, { content: 'b' }, fresh.version);

    await expect(nodeService.update(userId, node._id, { content: 'c' }, 1)).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
      fields: [{ field: 'version', message: 'expected 1, got 3' }],
    });
  });

  it('update with baseVersion -1 force-overwrites and flags lostUpdate', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, { title: 'Force', content: 'a' });
    await nodeService.addChoice(userId, node._id, { label: 'On' });
    const fresh = await BranchNode.findById(node._id);
    await nodeService.update(userId, node._id, { content: 'b' }, fresh.version);

    const updated = await nodeService.update(userId, node._id, { content: 'c' }, -1);
    expect(updated.content).toBe('c');
    expect(updated.lostUpdate).toBe(true);
  });

  it('update marking an ending node while it still has choices → 400', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, { title: 'Almost', content: 'scene' });
    await nodeService.addChoice(userId, node._id, { label: 'Follow through' });
    await expectAppError(
      nodeService.update(userId, node._id, { isEnding: true }),
      'VALIDATION_ERROR',
      400,
    );
  });

  it('update setting content on a non-ending node with zero choices → 400', async () => {
    const story = await branchingStory();
    const node = await nodeService.create(userId, story._id, { title: 'Empty' });
    await expectAppError(
      nodeService.update(userId, node._id, { content: 'now a real scene' }, node.version),
      'VALIDATION_ERROR',
      400,
    );
  });

  it('remove cascades incoming choice edges → targetNodeId null + orphanedChoices count', async () => {
    const story = await branchingStory();
    const start = await nodeService.create(userId, story._id, { title: 'Start', content: 's' });
    const target = await nodeService.create(userId, story._id, {
      parentId: start._id,
      title: 'Vanishing Door',
      content: 'v',
    });
    await nodeService.addChoice(userId, start._id, { label: 'Go in', targetNodeId: target._id });

    const result = await nodeService.remove(userId, target._id, { cascade: true });
    expect(result.ok).toBe(true);
    expect(result.orphanedChoices).toBe(1);

    const freshStart = await BranchNode.findById(start._id);
    expect(freshStart.choices[0].targetNodeId).toBeNull();
    expect(await BranchNode.findById(target._id)).toBeNull();
  });

  it('remove with cascade=0 and children → 409 HAS_CHILDREN', async () => {
    const story = await branchingStory();
    const parent = await nodeService.create(userId, story._id, { title: 'Parent', content: 'p' });
    await nodeService.create(userId, story._id, {
      parentId: parent._id,
      title: 'Kid',
      content: 'k',
    });

    await expectAppError(
      nodeService.remove(userId, parent._id, { cascade: false }),
      'HAS_CHILDREN',
      409,
    );
    expect(await BranchNode.findById(parent._id)).toBeTruthy();
  });

  it('remove with cascade=0 and no children deletes → { ok, orphanedChoices: 0 }', async () => {
    const story = await branchingStory();
    const solo = await nodeService.create(userId, story._id, { title: 'Solo', content: 's' });
    const result = await nodeService.remove(userId, solo._id, { cascade: false });
    expect(result.ok).toBe(true);
    expect(result.orphanedChoices).toBe(0);
    expect(await BranchNode.findById(solo._id)).toBeNull();
  });

  it('list returns nodes and edges; throws on non-branching story', async () => {
    const story = await branchingStory();
    const a = await nodeService.create(userId, story._id, { title: 'A', content: 'a' });
    await nodeService.create(userId, story._id, { parentId: a._id, title: 'B', content: 'b' });
    await nodeService.addChoice(userId, a._id, { label: 'To B' });

    const { nodes, edges } = await nodeService.list(userId, story._id);
    expect(nodes).toHaveLength(2);
    const parentEdge = edges.find((e) => e.label === 'B');
    expect(parentEdge).toMatchObject({ from: a._id.toString() });
    expect(edges.some((e) => e.label === 'To B' && e.choiceId)).toBe(true);

    const linear = await linearStory();
    await expectAppError(nodeService.list(userId, linear._id), 'VALIDATION_ERROR', 400);
  });

  it('computeNodeWordCount sums words across all nodes, ignoring blanks', async () => {
    const story = await branchingStory('Word Count Tale');
    const root = await nodeService.create(userId, story._id, {
      title: 'A',
      content: 'one two three',
    });
    await nodeService.create(userId, story._id, {
      parentId: root._id,
      title: 'B',
      content: 'four five',
    });
    // A whitespace-only draft node contributes zero words.
    await nodeService.create(userId, story._id, {
      parentId: root._id,
      title: 'Draft',
      content: '   ',
    });

    expect(await nodeService.computeNodeWordCount(story._id)).toBe(5);
  });

  it('remove cascade clears incoming edges from multiple owners in one pass', async () => {
    const story = await branchingStory('Multi Owner');
    const start = await nodeService.create(userId, story._id, { title: 'Start', content: 's' });
    const other = await nodeService.create(userId, story._id, {
      parentId: start._id,
      title: 'Other',
      content: 'o',
    });
    const target = await nodeService.create(userId, story._id, {
      parentId: start._id,
      title: 'Hub',
      content: 'h',
    });
    await nodeService.addChoice(userId, start._id, {
      label: 'In from start',
      targetNodeId: target._id,
    });
    await nodeService.addChoice(userId, other._id, {
      label: 'In from other',
      targetNodeId: target._id,
    });

    const result = await nodeService.remove(userId, target._id, { cascade: true });
    expect(result.ok).toBe(true);
    expect(result.orphanedChoices).toBe(2);

    const freshStart = await BranchNode.findById(start._id);
    const freshOther = await BranchNode.findById(other._id);
    expect(freshStart.choices.find((c) => c.label === 'In from start').targetNodeId).toBeNull();
    expect(freshOther.choices.find((c) => c.label === 'In from other').targetNodeId).toBeNull();
  });
});
