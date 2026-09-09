import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CanvasView } from '../components/stories/CanvasView';
import { Sidebar } from '../components/stories/Sidebar';
import type { Node, Link, Character } from '../types/story';

describe('CanvasView Component', () => {
  const mockNodes: Node[] = [
    {
      id: 'node-1',
      storyId: 'story-1',
      title: 'Node 1',
      content: 'Content 1',
      characters: [],
      isStartNode: true,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    },
    {
      id: 'node-2',
      storyId: 'story-1',
      title: 'Node 2',
      content: 'Content 2',
      characters: [],
      isStartNode: false,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    }
  ];

  const mockLinks: Link[] = [
    {
      id: 'link-1',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      label: 'Go',
    }
  ];

  const mockOnNodeSelect = vi.fn();
  const mockOnLinkCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all nodes passed via nodes prop', () => {
    render(
      <CanvasView
        nodes={mockNodes}
        links={mockLinks}
        onNodeSelect={mockOnNodeSelect}
        onLinkCreate={mockOnLinkCreate}
      />
    );
    expect(screen.getByText('Node 1')).toBeInTheDocument();
    expect(screen.getByText('Node 2')).toBeInTheDocument();
  });

  it('triggers onNodeSelect when a node is clicked', () => {
    render(
      <CanvasView
        nodes={mockNodes}
        links={mockLinks}
        onNodeSelect={mockOnNodeSelect}
        onLinkCreate={mockOnLinkCreate}
      />
    );
    fireEvent.click(screen.getByText('Node 1').parentElement as HTMLElement);
    expect(mockOnNodeSelect).toHaveBeenCalledWith('node-1');
  });

  it('renders all links passed via links prop', () => {
    render(
      <CanvasView
        nodes={mockNodes}
        links={mockLinks}
        onNodeSelect={mockOnNodeSelect}
        onLinkCreate={mockOnLinkCreate}
      />
    );
    // The link label appears inside the SVG <text> node (and its <title> child).
    expect(screen.getAllByText('Go').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Go')[0].tagName.toLowerCase()).toBe('text');
  });
});

describe('Sidebar Component', () => {
  const mockNode: Node = {
    id: 'node-1',
    storyId: 'story-1',
    title: 'Node 1',
    content: 'Content 1',
    characters: [],
    isStartNode: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  const mockCharacters: Character[] = [
    {
      id: 'char-1',
      name: 'Alice',
      description: 'Main character',
      createdAt: '2023-01-01T00:00:00.000Z',
    }
  ];

  it('renders NodeDetailsEditor with selected node data', () => {
    render(<Sidebar selectedNode={mockNode} characters={mockCharacters} />);
    expect(screen.getByDisplayValue('Node 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Content 1')).toBeInTheDocument();
  });

  it('renders CharacterManager with character list', () => {
    render(<Sidebar selectedNode={mockNode} characters={mockCharacters} />);
    expect(screen.getByText('Characters')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});