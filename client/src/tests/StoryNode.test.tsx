import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StoryNode } from '../components/stories/StoryNode';
import { StoryLink } from '../components/stories/StoryLink';
import type { Node, Link } from '../types/story';

describe('StoryNode Component', () => {
  const mockNode: Node = {
    id: 'node-1',
    storyId: 'story-1',
    title: 'Forest Entrance',
    content: 'You stand at the edge of a dark forest.',
    characters: [],
    isStartNode: false,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders node title and content', () => {
    render(<StoryNode node={mockNode} isSelected={false} onClick={mockOnClick} />);
    expect(screen.getByText('Forest Entrance')).toBeInTheDocument();
    expect(screen.getByText('You stand at the edge of a dark forest.')).toBeInTheDocument();
  });

  it('renders "Start Node" badge only when isStartNode is true', () => {
    const { rerender } = render(<StoryNode node={mockNode} isSelected={false} onClick={mockOnClick} />);
    expect(screen.queryByText('Start Node')).not.toBeInTheDocument();

    const startNode = { ...mockNode, isStartNode: true };
    rerender(<StoryNode node={startNode} isSelected={false} onClick={mockOnClick} />);
    expect(screen.getByText('Start Node')).toBeInTheDocument();
  });

  it('applies selection styling or data-selected attribute when isSelected is true', () => {
    const { rerender, container } = render(<StoryNode node={mockNode} isSelected={false} onClick={mockOnClick} />);

    let element = container.firstChild as HTMLElement;
    expect(element.getAttribute('data-selected')).toBe('false');

    rerender(<StoryNode node={mockNode} isSelected={true} onClick={mockOnClick} />);
    element = container.firstChild as HTMLElement;
    expect(element.getAttribute('data-selected')).toBe('true');
  });

  it('invokes onClick with node.id when clicked or keyboard interaction', () => {
    render(<StoryNode node={mockNode} isSelected={false} onClick={mockOnClick} />);
    const nodeEl = screen.getByText('Forest Entrance').parentElement as HTMLElement;

    // Click
    fireEvent.click(nodeEl);
    expect(mockOnClick).toHaveBeenCalledWith('node-1');

    // Keyboard (Enter)
    fireEvent.keyDown(nodeEl, { key: 'Enter', code: 'Enter' });
    expect(mockOnClick).toHaveBeenCalledTimes(2);

    // Keyboard (Space)
    fireEvent.keyDown(nodeEl, { key: ' ', code: 'Space' });
    expect(mockOnClick).toHaveBeenCalledTimes(3);
  });
});

describe('StoryLink Component', () => {
  const mockLink: Link = {
    id: 'link-1',
    sourceNodeId: 'node-1',
    targetNodeId: 'node-2',
    label: 'Go deeper',
    condition: 'hasKey',
  };

  it('renders link label and condition tooltip', () => {
    const { container } = render(
      <svg>
        <StoryLink link={mockLink} startX={0} startY={0} endX={100} endY={100} />
      </svg>
    );
    const labelEl = container.querySelector('text.story-link-label');
    // The <text> node's last child is the rendered label (after the <title> tooltip).
    expect(labelEl?.lastChild?.textContent).toBe('Go deeper');
    expect(container.querySelector('title')?.textContent).toBe('Condition: hasKey');
  });
});