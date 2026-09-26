import { create } from 'zustand';
import { AppError } from '../types/domain';
import type { BranchNode, BranchEdge, AsyncStatus, ID } from '../types/domain';
import { nodesApi } from '../services/api';
import { useToastStore } from './toastStore';

export type GenerationPhase = 'idle' | 'streaming' | 'done' | 'error';

interface GenerationSlice {
  phase: GenerationPhase;
  streamText: string;
  error: AppError | null;
}

interface BranchState {
  nodes: BranchNode[];
  edges: BranchEdge[];
  status: AsyncStatus;
  error: AppError | null;
  selectedId: ID | null;
  generation: GenerationSlice;
  fetch(storyId: ID): Promise<void>;
  select(id: ID | null): void;
  addNode(storyId: ID, parentId?: ID | null): Promise<ID>;
  updateNode(
    node: BranchNode,
    patch: Partial<Pick<BranchNode, 'title' | 'content' | 'summary' | 'isEnding'>>,
  ): Promise<void>;
  deleteNode(id: ID): Promise<void>;
  addChoice(nodeId: ID, label: string): Promise<void>;
  removeChoice(nodeId: ID, choiceId: ID): Promise<void>;
  generateNode(storyId: ID, parentId?: ID | null): Promise<void>;
  clearError(): void;
}

function computeEdges(nodes: BranchNode[]): BranchEdge[] {
  const edges: BranchEdge[] = [];
  for (const node of nodes) {
    for (const ch of node.choices) {
      edges.push({ from: node._id, to: ch.targetNodeId, label: ch.label });
    }
  }
  return edges;
}

function setNode(nodes: BranchNode[], updated: BranchNode): BranchNode[] {
  return nodes.map((n) => (n._id === updated._id ? updated : n));
}

let generateController: AbortController | null = null;

export const useBranchStore = create<BranchState>((set, get) => ({
  nodes: [],
  edges: [],
  status: 'idle',
  error: null,
  selectedId: null,
  generation: { phase: 'idle', streamText: '', error: null },

  fetch: async (storyId) => {
    set({ status: 'loading', error: null });
    try {
      const { nodes } = await nodesApi.list(storyId);
      set({ nodes, edges: computeEdges(nodes), status: nodes.length === 0 ? 'empty' : 'success' });
    } catch (e) {
      const err = e as AppError;
      set({ error: err, status: 'error' });
    }
  },

  select: (id) => set({ selectedId: id }),

  addNode: async (storyId, parentId = null) => {
    const { node } = await nodesApi.create(storyId, { parentId });
    set((s) => ({
      nodes: [...s.nodes, node],
      edges: computeEdges([...s.nodes, node]),
      status: 'success',
      selectedId: node._id,
    }));
    useToastStore.getState().push('Branch node added', 'success');
    return node._id;
  },

  updateNode: async (node, patch) => {
    const { node: updated } = await nodesApi.update(node._id, {
      ...patch,
      baseVersion: node.version,
    });
    set((s) => ({
      nodes: setNode(s.nodes, updated),
      edges: computeEdges(setNode(s.nodes, updated)),
    }));
  },

  deleteNode: async (id) => {
    await nodesApi.remove(id, { cascade: true });
    set((s) => {
      const nodes = s.nodes.filter((n) => n._id !== id);
      return {
        nodes,
        edges: computeEdges(nodes),
        selectedId: s.selectedId === id ? null : s.selectedId,
      };
    });
    useToastStore.getState().push('Node deleted', 'info');
  },

  addChoice: async (nodeId, label) => {
    const node = get().nodes.find((n) => n._id === nodeId);
    if (!node) return;
    const { choice } = await nodesApi.addChoice(nodeId, { label });
    const updated: BranchNode = { ...node, choices: [...node.choices, choice] };
    set((s) => ({
      nodes: setNode(s.nodes, updated),
      edges: computeEdges(setNode(s.nodes, updated)),
    }));
    useToastStore.getState().push('Choice added', 'success');
  },

  removeChoice: async (nodeId, choiceId) => {
    await nodesApi.removeChoice(nodeId, choiceId);
    set((s) => {
      const nodes = s.nodes.map((n) =>
        n._id === nodeId ? { ...n, choices: n.choices.filter((c) => c._id !== choiceId) } : n,
      );
      return { nodes, edges: computeEdges(nodes) };
    });
  },

  generateNode: async (storyId, parentId = null) => {
    if (generateController) generateController.abort();
    generateController = new AbortController();
    const signal = generateController.signal;
    set({ generation: { phase: 'streaming', streamText: '', error: null } });

    const fail = (err: AppError) => {
      set((s) => ({ generation: { ...s.generation, phase: 'error', error: err } }));
      useToastStore.getState().push(err.message, 'error');
    };

    try {
      await nodesApi.generateNode(
        storyId,
        parentId,
        {
          onDocStart: () => set({}),
          onDelta: (text) =>
            set((s) => ({
              generation: { ...s.generation, streamText: s.generation.streamText + text },
            })),
          onSummary: () => set({}),
          onDone: (payload) => {
            const node = (payload as unknown as { saved?: BranchNode }).saved;
            if (!node) return;
            set((s) => {
              if (s.nodes.some((n) => n._id === node._id)) {
                return { generation: { ...s.generation, phase: 'done' } };
              }
              const merged: BranchNode = {
                ...node,
                storyId,
                parentId: node.parentId ?? parentId ?? null,
                isAIGenerated: true,
                versions: node.versions ?? [],
              };
              const nodes = [...s.nodes, merged];
              return {
                nodes,
                edges: computeEdges(nodes),
                selectedId: merged._id,
                generation: { ...s.generation, phase: 'done' },
              };
            });
            useToastStore.getState().push('Continuation generated', 'success');
          },
          onError: (err) => fail(err),
          onClose: () => set({}),
        },
        signal,
      );
    } catch (e) {
      if (!signal.aborted) {
        fail(
          e instanceof AppError
            ? e
            : new AppError('NETWORK_ERROR', e instanceof Error ? e.message : 'Generation failed.'),
        );
      }
    }
  },

  clearError: () => set({ error: null }),
}));

export const selectNodeById = (nodes: BranchNode[], id: ID | null): BranchNode | undefined =>
  id ? nodes.find((n) => n._id === id) : undefined;

export const countChildren = (nodes: BranchNode[], id: ID): number =>
  nodes.filter((n) => n.parentId === id).length;
