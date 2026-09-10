import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBranchStore } from '../store/branchStore';
import { nodesApi } from '../services/api';
import { makeBranchNode } from './fixtures';

// TICKET-73: BranchState Zustand store.
describe('TICKET-73 — branch store', () => {
  beforeEach(() => {
    useBranchStore.setState({ nodes: [], edges: [], status: 'idle', error: null, selectedId: null });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('fetch loads nodes and computes edges from choices', async () => {
    vi.spyOn(nodesApi, 'list').mockResolvedValue({ nodes: [makeBranchNode()] });
    await useBranchStore.getState().fetch('s1');
    expect(useBranchStore.getState().nodes).toHaveLength(1);
    expect(useBranchStore.getState().status).toBe('success');
    // choice targetNodeId n2 -> edge {from: n1, to: n2, label}
    expect(useBranchStore.getState().edges).toEqual([
      { from: 'n1', to: 'n2', label: 'Open the journal' },
    ]);
  });

  it('fetch empty sets empty status', async () => {
    vi.spyOn(nodesApi, 'list').mockResolvedValue({ nodes: [] });
    await useBranchStore.getState().fetch('s1');
    expect(useBranchStore.getState().status).toBe('empty');
  });

  it('select updates selectedId', () => {
    useBranchStore.getState().select('n1');
    expect(useBranchStore.getState().selectedId).toBe('n1');
  });

  it('addNode appends node and selects it', async () => {
    const node = makeBranchNode({ _id: 'n3', parentId: 'n1' });
    vi.spyOn(nodesApi, 'create').mockResolvedValue({ node });
    const id = await useBranchStore.getState().addNode('s1', 'n1');
    expect(id).toBe('n3');
    expect(useBranchStore.getState().nodes.some((n) => n._id === 'n3')).toBe(true);
    expect(useBranchStore.getState().selectedId).toBe('n3');
  });

  it('updateNode sends baseVersion and replaces node', async () => {
    useBranchStore.setState({ nodes: [makeBranchNode()], selectedId: 'n1' });
    const updated = makeBranchNode({ title: 'The Storm Rages' });
    const updateSpy = vi.spyOn(nodesApi, 'update').mockResolvedValue({ node: updated });
    await useBranchStore.getState().updateNode(makeBranchNode(), { title: 'The Storm Rages' });
    expect(updateSpy).toHaveBeenCalledWith('n1', { title: 'The Storm Rages', baseVersion: 1 });
    expect(useBranchStore.getState().nodes[0].title).toBe('The Storm Rages');
  });

  it('deleteNode removes node + its edges', async () => {
    useBranchStore.setState({ nodes: [makeBranchNode()], status: 'success' });
    vi.spyOn(nodesApi, 'remove').mockResolvedValue({ ok: true });
    await useBranchStore.getState().deleteNode('n1');
    expect(useBranchStore.getState().nodes).toHaveLength(0);
    expect(useBranchStore.getState().edges).toHaveLength(0);
  });

  it('addChoice appends a choice and recomputes edges', async () => {
    useBranchStore.setState({ nodes: [makeBranchNode({ choices: [] })], status: 'success' });
    vi.spyOn(nodesApi, 'addChoice').mockResolvedValue({ choice: { _id: 'co2', label: 'Run', targetNodeId: 'n9' } });
    await useBranchStore.getState().addChoice('n1', 'Run');
    expect(useBranchStore.getState().nodes[0].choices).toHaveLength(1);
    expect(useBranchStore.getState().edges).toEqual([{ from: 'n1', to: 'n9', label: 'Run' }]);
  });

  it('removeChoice deletes a choice and its edge', async () => {
    useBranchStore.setState({ nodes: [makeBranchNode()], status: 'success' });
    vi.spyOn(nodesApi, 'removeChoice').mockResolvedValue({ ok: true });
    await useBranchStore.getState().removeChoice('n1', 'co1');
    expect(useBranchStore.getState().nodes[0].choices).toHaveLength(0);
    expect(useBranchStore.getState().edges).toHaveLength(0);
  });
});