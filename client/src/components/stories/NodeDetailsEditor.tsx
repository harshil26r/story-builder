import React from 'react';
import type { Node } from '../../types/story';
import './NodeDetailsEditor.css';

export interface NodeDetailsEditorProps {
  node: Node;
}

export const NodeDetailsEditor: React.FC<NodeDetailsEditorProps> = ({ node }) => {
  return (
    <div className="node-details-editor">
      <h3>Edit Node</h3>
      <div className="form-group">
        <label htmlFor="node-title">Title</label>
        <input 
          id="node-title"
          type="text" 
          defaultValue={node.title} 
        />
      </div>
      <div className="form-group">
        <label htmlFor="node-content">Content</label>
        <textarea 
          id="node-content"
          defaultValue={node.content} 
        />
      </div>
      <div className="form-group checkbox">
        <label>
          <input 
            type="checkbox" 
            defaultChecked={node.isStartNode} 
          />
          Is Start Node
        </label>
      </div>
    </div>
  );
};
