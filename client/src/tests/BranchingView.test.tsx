import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BranchingView } from '../components/branching/BranchingView';
import { useBranchStore } from '../store/branchStore';
import { useToastStore } from '../store/toastStore';
import { AppError } from '../types/domain';
import { makeBranchNode } from './fixtures';

// TICKET-74: BranchingView — graph view, node CRUD, and the AI generate
// continuation flow with live streaming progress (ACR-F-12).

const REAL_GENERATE = useBranchStore.getState().generateNode;
const REAL_FETCH = useBranchStore.getState().fetch;

function resetStore() {
  useBranchStore.setState({
    nodes: [],
    edges: [],
    status: 'idle',
    error: null,
    selectedId: null,
    generation: { phase: 'idle', streamText: '', error: null },
    generateNode: REAL_GENERATE,
    fetch: REAL_FETCH,
  });
  useToastStore.setState({ toasts: [] });
}

describe('TICKET-74 — BranchingView', () => {
  beforeEach(() => {
    resetStore();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the loading skeleton while nodes are fetched', () => {
    useBranchStore.setState({ status: 'loading' });
    render(<BranchingView storyId="s1" />);
    expect(screen.getByRole('status', { name: /loading branch nodes/i })).toBeInTheDocument();
  });

  it('renders the empty state prompting to create the first node', () => {
    useBranchStore.setState({ status: 'empty' });
    render(<BranchingView storyId="s1" />);
    expect(screen.getByText('No branches yet')).toBeInTheDocument();
    expect(screen.getByTestId('branch-add-first')).toBeInTheDocument();
  });

  it('surfaces fetch errors with a retry that refetches nodes', () => {
    const fetchNodes = vi.fn().mockResolvedValue(undefined);
    useBranchStore.setState({
      status: 'error',
      error: new AppError('NETWORK', 'Failed to fetch'),
      fetch: fetchNodes,
    });
    render(<BranchingView storyId="s1" />);
    expect(screen.getByTestId('error-alert')).toHaveTextContent('Failed to fetch');
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(fetchNodes).toHaveBeenCalledWith('s1');
  });

  it('renders node cards, choice edges, and child count on success', () => {
    const node = makeBranchNode({ _id: 'n1', title: 'The Storm Arrives' });
    useBranchStore.setState({
      nodes: [node],
      edges: [{ from: node._id, to: node.choices[0].targetNodeId, label: node.choices[0].label }],
      status: 'success',
    });
    render(<BranchingView storyId="s1" />);
    expect(screen.getByText('The Storm Arrives')).toBeInTheDocument();
    expect(screen.getByTestId('branch-node-count')).toHaveTextContent('1');
    expect(screen.getByTestId('branch-edge-count')).toHaveTextContent('1');
    expect(screen.getByText('Open the journal')).toBeInTheDocument();
    expect(screen.getByTestId('child-count-n1')).toHaveTextContent('0 children');
  });

  it('generate button drives branchStore.generateNode with the selected parent', () => {
    const node = makeBranchNode();
    useBranchStore.setState({
      nodes: [node],
      edges: [],
      status: 'success',
      selectedId: 'n1',
      generateNode: vi.fn().mockResolvedValue(undefined),
    });
    render(<BranchingView storyId="s1" />);
    fireEvent.click(screen.getByRole('button', { name: /generate continuation/i }));
    expect(useBranchStore.getState().generateNode).toHaveBeenCalledWith('s1', 'n1');
  });

  it('shows live streamed text (aria-live) and disables the button while streaming', () => {
    const node = makeBranchNode();
    useBranchStore.setState({
      nodes: [node],
      edges: [],
      status: 'success',
      selectedId: 'n1',
      generation: {
        phase: 'streaming',
        streamText: 'The storm grows over the harbor.',
        error: null,
      },
    });
    render(<BranchingView storyId="s1" />);
    const stream = screen.getByTestId('branch-generate-stream');
    expect(stream).toHaveAttribute('aria-live', 'polite');
    expect(stream).toHaveTextContent('The storm grows over the harbor.');
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
  });

  it('shows an ErrorAlert with retry that restarts generation on AI error', () => {
    const node = makeBranchNode();
    const generateNode = vi.fn().mockResolvedValue(undefined);
    useBranchStore.setState({
      nodes: [node],
      edges: [],
      status: 'success',
      selectedId: 'n1',
      generateNode,
      generation: {
        phase: 'error',
        streamText: 'partial',
        error: new AppError('AI_UNAVAILABLE', 'AI is busy'),
      },
    });
    render(<BranchingView storyId="s1" />);
    expect(screen.getByTestId('error-alert')).toHaveTextContent('AI is busy');
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(generateNode).toHaveBeenCalledWith('s1', 'n1');
  });
});
