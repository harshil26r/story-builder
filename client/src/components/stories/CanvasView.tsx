import React, { useState } from 'react';
import type { Node, Link } from '../../types/story';
import { StoryNode } from './StoryNode';
import { StoryLink } from './StoryLink';
import './CanvasView.css';

export interface CanvasViewProps {
  nodes: Node[];
  links: Link[];
  onNodeSelect: (nodeId: string) => void;
  onLinkCreate: (sourceId: string, targetId: string) => void;
}

export const CanvasView: React.FC<CanvasViewProps> = ({ nodes, links, onNodeSelect }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleNodeClick = (id: string) => {
    setSelectedNodeId(id);
    onNodeSelect(id);
  };

  // Very basic positioning for mock visual display.
  // In a real app, nodes would have x/y coordinates.
  const getNodePos = (index: number) => {
    const x = 100 + (index * 200);
    const y = 100 + (index % 2 === 0 ? 0 : 100);
    return { x, y };
  };

  return (
    <div className="canvas-view" role="region" aria-label="Story Canvas">
      <svg className="canvas-svg">
        {links.map((link) => {
          const sourceIndex = nodes.findIndex(n => n.id === link.sourceNodeId);
          const targetIndex = nodes.findIndex(n => n.id === link.targetNodeId);
          if (sourceIndex === -1 || targetIndex === -1) return null;

          const startPos = getNodePos(sourceIndex);
          const endPos = getNodePos(targetIndex);

          return (
            <StoryLink
              key={link.id}
              link={link}
              startX={startPos.x + 100}
              startY={startPos.y + 50}
              endX={endPos.x}
              endY={endPos.y + 50}
            />
          );
        })}
      </svg>
      <div className="canvas-nodes">
        {nodes.map((node, i) => {
          const pos = getNodePos(i);
          return (
            <div 
              key={node.id} 
              style={{ position: 'absolute', left: pos.x, top: pos.y, width: '150px' }}
            >
              <StoryNode
                node={node}
                isSelected={selectedNodeId === node.id}
                onClick={handleNodeClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
