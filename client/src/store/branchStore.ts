import { create } from 'zustand';
import type { BranchNode, BranchEdge, AsyncStatus, AppError, ID } from '../types/domain';
import { nodesApi } from '../services/api';
import { useToastStore } from './toastStore';

interface BranchState {
  nodes: BranchNode[];
  edges: BranchEdge[];
  status: AsyncStatus;
  error: AppError | null;
  selectedId: ID | null;
  fetch(storyId: ID): Promise<void>;
  select(id: ID | null): void;
  addNode(storyId: ID, parentId?: ID | null): Promise<ID>;
  updateNode(node: BranchNode, patch: Partial<Pick<BranchNode, 'title' | 'content' | 'summary' | 'isEnding'>>): Promise<void>;
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

export const useBranchStore = create<BranchState>((set, get) => ({
  nodes: [],
  edges: [],
  status: 'idle',
  error: null,
  selectedId: null,

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
    const { node: updated } = await nodesApi.update(node._id, { ...patch, baseVersion: node.version });
    set((s) => ({ nodes: setNode(s.nodes, updated), edges: computeEdges(setNode(s.nodes, updated)) }));
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
    set((s) => ({ nodes: setNode(s.nodes, updated), edges: computeEdges(setNode(s.nodes, updated)) }));
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

  generateNode: async (_storyId, _parentId = null) => {
    set({ status: 'loading' });
  },

  clearError: () => set({ error: null }),
}));

export const selectNodeById = (nodes: BranchNode[], id: ID | null): BranchNode | undefined =>
  id ? nodes.find((n) => n._id === id) : undefined;

export const countChildren = (nodes: BranchNode[], id: ID): number =>
  nodes.filter((n) => n.parentId === id).length;