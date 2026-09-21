import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { Character, CharacterRelationship, RelationshipType } from '../../types/domain';
import { Button } from '../ui/Button';

export interface CharacterRelationshipsEditorProps {
  characterId: string;
  available: Character[];
  value: CharacterRelationship[];
  onChange: (next: CharacterRelationship[]) => void;
  lookup?: (id: string) => Character | undefined;
}

const RELATION_TYPES: RelationshipType[] = [
  'friend',
  'rival',
  'sibling',
  'mentor',
  'parent',
  'spouse',
  'enemy',
  'secret-ally',
];

export function CharacterRelationshipsEditor({
  characterId,
  available,
  value,
  onChange,
  lookup,
}: CharacterRelationshipsEditorProps) {
  const [selected, setSelected] = useState('');
  const [relType, setRelType] = useState<RelationshipType>('friend');

  // Only same-user characters, excluding self.
  const candidates = available.filter((c) => c._id !== characterId);

  const add = () => {
    if (!selected) return;
    if (value.some((v) => v.characterId === selected)) return;
    onChange([...value, { characterId: selected, relationType: relType }]);
    setSelected('');
  };

  const remove = (id: string) => {
    onChange(value.filter((v) => v.characterId !== id));
  };

  const nameOf = (id: string): string => {
    if (lookup) {
      const c = lookup(id);
      if (c) return c.name;
    }
    return available.find((c) => c._id === id)?.name ?? '(unknown character)';
  };

  return (
    <div className="space-y-3" data-testid="relationships-editor">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Relationships</p>

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((rel) => (
            <li
              key={rel.characterId}
              className="flex items-center justify-between rounded-md border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-sm"
            >
              <span className="text-slate-200">
                {nameOf(rel.characterId)}{' '}
                <span className="text-xs text-indigo-300">({rel.relationType})</span>
              </span>
              <button
                onClick={() => remove(rel.characterId)}
                aria-label={`Remove relationship with ${nameOf(rel.characterId)}`}
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {candidates.length === 0 ? (
        <p className="text-sm text-slate-500">Create more characters to add relationships.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Choose character"
            className="rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          >
            <option value="">Select character…</option>
            {candidates
              .filter((c) => !value.some((v) => v.characterId === c._id))
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
          </select>
          <select
            value={relType}
            onChange={(e) => setRelType(e.target.value as RelationshipType)}
            aria-label="Relationship type"
            className="rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          >
            {RELATION_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="secondary" onClick={add} disabled={!selected}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
