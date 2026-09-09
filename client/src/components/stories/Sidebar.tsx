import React from 'react';
import type { Node, Character } from '../../types/story';
import { NodeDetailsEditor } from './NodeDetailsEditor';
import { CharacterManager } from './CharacterManager';
import './Sidebar.css';

export interface SidebarProps {
  selectedNode: Node | null;
  characters: Character[];
}

export const Sidebar: React.FC<SidebarProps> = ({ selectedNode, characters }) => {
  return (
    <aside className="sidebar">
      {selectedNode ? (
        <NodeDetailsEditor node={selectedNode} />
      ) : (
        <div className="sidebar-empty">Select a node to edit details</div>
      )}
      <CharacterManager characters={characters} />
    </aside>
  );
};
