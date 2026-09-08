import React from 'react';
import type { Node } from '../../types/story';
import './StoryNode.css';

export interface StoryNodeProps {
  node: Node;
  isSelected: boolean;
  onClick: (id: string) => void;
}

export const StoryNode: React.FC<StoryNodeProps> = ({ node, isSelected, onClick }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(node.id);
    }
  };

  return (
    <div
      className={`story-node ${isSelected ? 'selected' : ''}`}
      data-selected={isSelected.toString()}
      onClick={() => onClick(node.id)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      {node.isStartNode && <div className="start-node-badge">Start Node</div>}
      <h3 className="story-node-title">{node.title}</h3>
      <p className="story-node-content">{node.content}</p>
    </div>
  );
};
