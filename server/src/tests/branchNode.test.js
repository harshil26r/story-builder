import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import BranchNode from '../models/BranchNode.js';

describe('BranchNode model (TICKET-70)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-branch-node';

  const storyId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await BranchNode.syncIndexes();
  });

  afterAll(async () => {
    await BranchNode.deleteMany({});
    await mongoose.disconnect();
  });

  it('BranchNode.create({ storyId, title, content, isStart: true }) succeeds and defaults sane', async () => {
    const node = await BranchNode.create({
      storyId,
      title: 'The Gate',
      content: 'You stand at the iron gate.',
      isStart: true,
    });

    expect(node.storyId.toString()).toBe(storyId.toString());
    expect(node.title).toBe('The Gate');
    expect(node.content).toBe('You stand at the iron gate.');
    expect(node.isStart).toBe(true);
    expect(node.isEnding).toBe(false);
    expect(node.isAIGenerated).toBe(false);
    expect(node.version).toBe(1);
    expect(node.parentId).toBeNull();
    await node.deleteOne();
  });

  it('choices is an array of { _id, label, targetNodeId }', async () => {
    const target = await BranchNode.create({ storyId, title: 'Target', content: 'The end.' });
    const node = await BranchNode.create({
      storyId,
      title: 'With Choices',
      content: 'Pick a path.',
      choices: [
        { label: 'Descend into the crypt', targetNodeId: target._id },
        { label: 'Climb the tower', targetNodeId: null },
      ],
    });

    expect(Array.isArray(node.choices)).toBe(true);
    expect(node.choices).toHaveLength(2);
    const [first, second] = node.choices;
    expect(first._id).toBeTruthy();
    expect(first.label).toBe('Descend into the crypt');
    expect(first.targetNodeId.toString()).toBe(target._id.toString());
    expect(second.targetNodeId).toBeNull();
    await node.deleteOne();
    await target.deleteOne();
  });

  it('versions is an array of ContentSnapshot { version, content, summary, modifiedAt, mode }', async () => {
    const node = await BranchNode.create({ storyId, title: 'Draft', content: 'v1 text' });
    node.versions.push({
      version: 1,
      content: 'v1 text',
      summary: 'Opening scene.',
      modifiedAt: new Date(),
      mode: 'ai',
    });
    await node.save();

    expect(Array.isArray(node.versions)).toBe(true);
    const snap = node.versions[0];
    expect(snap.version).toBe(1);
    expect(snap.content).toBe('v1 text');
    expect(snap.summary).toBe('Opening scene.');
    expect(snap.modifiedAt).toBeInstanceOf(Date);
    expect(snap.mode).toBe('ai');
    await node.deleteOne();
  });

  it('isStart and isEnding are booleans (default false)', async () => {
    const plain = await BranchNode.create({ storyId, title: 'Plain', content: 'x' });
    expect(typeof plain.isStart).toBe('boolean');
    expect(typeof plain.isEnding).toBe('boolean');
    expect(plain.isStart).toBe(false);
    expect(plain.isEnding).toBe(false);

    const ending = await BranchNode.create({
      storyId,
      title: 'End',
      content: 'Fin.',
      isEnding: true,
    });
    expect(ending.isEnding).toBe(true);
    await plain.deleteOne();
    await ending.deleteOne();
  });

  it('parentId is optional (null by default, settable to another node)', async () => {
    const parent = await BranchNode.create({ storyId, title: 'Parent', content: 'root' });
    const child = await BranchNode.create({
      storyId,
      title: 'Child',
      content: 'branch',
      parentId: parent._id,
    });

    expect(child.parentId.toString()).toBe(parent._id.toString());
    const orphan = await BranchNode.create({ storyId, title: 'Rootless', content: 'no parent' });
    expect(orphan.parentId).toBeNull();
    await parent.deleteOne();
    await child.deleteOne();
    await orphan.deleteOne();
  });

  it('requires storyId', async () => {
    await expect(BranchNode.create({ title: 'No Story', content: 'x' })).rejects.toThrow();
  });

  it('storyId is indexed', async () => {
    const indexes = await BranchNode.collection.indexes();
    const idx = indexes.find((i) => i.key && i.key.storyId === 1);
    expect(idx).toBeTruthy();
  });
});
