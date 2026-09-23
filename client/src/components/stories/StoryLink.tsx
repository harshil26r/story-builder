import React from 'react';
import type { Link } from '../../types/story';

export interface StoryLinkProps {
  link: Link;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const StoryLink: React.FC<StoryLinkProps> = ({ link, startX, startY, endX, endY }) => {
  // Simple straight line or bezier curve between points
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  return (
    <g className="story-link">
      <path
        d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
        fill="none"
        stroke="#888"
        strokeWidth={2}
      />
      <text
        x={midX}
        y={midY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#333"
        fontSize={12}
        className="story-link-label"
      >
        <title>{link.condition ? `Condition: ${link.condition}` : link.label}</title>
        {link.label}
      </text>
    </g>
  );
};
