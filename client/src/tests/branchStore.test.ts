import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBranchStore } from '../store/branchStore';
import { nodesApi } from '../services/api';
import { AppError } from '../types/domain';
import { makeBranchNode } from './fixtures';

// TICKET-73: BranchState Zustand store.
describe('TICKET-73 — branch store', () => {
  beforeEach(() => {
    useBranchStore.setState({
      nodes: [],
      edges: [],
      status: 'idle',
      error: null,
      selectedId: null,
      generation: { phase: 'idle', streamText: '', error: null },
    });
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
    vi.spyOn(nodesApi, 'addChoice').mockResolvedValue({
      choice: { _id: 'co2', label: 'Run', targetNodeId: 'n9' },
    });
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

  it('generateNode doc-start begins a streaming generation and deltas append streamText', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    vi.spyOn(nodesApi, 'generateNode').mockImplementation((_storyId, _parentId, handlers) => {
      handlers.onDocStart?.({
        jobId: 'j1',
        storyId: 's1',
        structureType: 'branching',
        chapterIndex: 0,
        title: 'The Storm',
        nodeId: 'n2',
      });
      handlers.onDelta?.('The wind ');
      handlers.onDelta?.('howled.');
      return gate;
    });
    const pending = useBranchStore.getState().generateNode('s1', 'n1');
    expect(useBranchStore.getState().generation.phase).toBe('streaming');
    expect(useBranchStore.getState().generation.streamText).toBe('The wind howled.');
    release();
    await pending;
  });

  it('generateNode done inserts node, recomputes edges, and selects it', async () => {
    useBranchStore.setState({
      nodes: [makeBranchNode({ choices: [] })],
      edges: [],
      status: 'success',
      selectedId: 'n1',
      generation: { phase: 'streaming', streamText: 'The wind howled.', error: null },
    });
    const generated = makeBranchNode({
      _id: 'n2',
      parentId: 'n1',
      title: 'The Storm',
      choices: [{ _id: 'co2', label: 'Dive into the crypt', targetNodeId: 'n9' }],
    });
    vi.spyOn(nodesApi, 'generateNode').mockImplementation((_storyId, _parentId, handlers) => {
      handlers.onDone?.({ saved: generated } as never);
      return Promise.resolve();
    });
    await useBranchStore.getState().generateNode('s1', 'n1');
    const state = useBranchStore.getState();
    expect(state.nodes.map((n) => n._id)).toContain('n2');
    expect(state.edges).toEqual([{ from: 'n2', to: 'n9', label: 'Dive into the crypt' }]);
    expect(state.selectedId).toBe('n2');
    expect(state.generation.phase).toBe('done');
  });

  it('generateNode on error sets generation error and phase', async () => {
    vi.spyOn(nodesApi, 'generateNode').mockImplementation((_storyId, _parentId, handlers) => {
      handlers.onError?.(new AppError('AI_UNAVAILABLE', 'AI is unavailable'));
      return Promise.resolve();
    });
    await useBranchStore.getState().generateNode('s1', 'n1');
    const generation = useBranchStore.getState().generation;
    expect(generation.phase).toBe('error');
    expect(generation.error?.code).toBe('AI_UNAVAILABLE');
  });

  it('generateNode handles a network failure without throwing', async () => {
    vi.spyOn(nodesApi, 'generateNode').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(useBranchStore.getState().generateNode('s1', 'n1')).resolves.toBeUndefined();
    const generation = useBranchStore.getState().generation;
    expect(generation.phase).toBe('error');
    expect(generation.error?.message).toBe('Failed to fetch');
  });
});
