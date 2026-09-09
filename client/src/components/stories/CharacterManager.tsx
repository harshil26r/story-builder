import React from 'react';
import type { Character } from '../../types/story';
import './CharacterManager.css';

export interface CharacterManagerProps {
  characters: Character[];
}

export const CharacterManager: React.FC<CharacterManagerProps> = ({ characters }) => {
  return (
    <div className="character-manager">
      <h3>Characters</h3>
      {characters.length === 0 ? (
        <p>No characters added yet.</p>
      ) : (
        <ul className="character-list">
          {characters.map(char => (
            <li key={char.id} className="character-item">
              <strong>{char.name}</strong>
              <p>{char.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
