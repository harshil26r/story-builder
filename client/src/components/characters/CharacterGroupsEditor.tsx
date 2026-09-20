import { useEffect, useState } from 'react';
import { FolderTree, Plus, X } from 'lucide-react';
import type { ID } from '../../types/domain';
import { useCharacterStore } from '../../store/characterStore';
import { Spinner } from '../ui/Spinner';
import { ErrorAlert } from '../ui/ErrorAlert';
import { Button } from '../ui/Button';

/** Edits which user-curated groups a character belongs to (many-to-many).
 *  Groups are managed here (create + toggle); renaming/deleting groups happens
 *  on the dashboard. */
export interface CharacterGroupsEditorProps {
  characterId: ID;
  groupIds: ID[];
}

export function CharacterGroupsEditor({ characterId, groupIds }: CharacterGroupsEditorProps) {
  const groups = useCharacterStore((s) => s.groups);
  const status = useCharacterStore((s) => s.groupsStatus);
  const error = useCharacterStore((s) => s.groupsError);
  const fetchGroups = useCharacterStore((s) => s.fetchGroups);
  const createGroup = useCharacterStore((s) => s.createGroup);
  const setGroups = useCharacterStore((s) => s.setGroups);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === 'idle') void fetchGroups();
  }, [status, fetchGroups]);

  const selected = new Set(groupIds);

  const toggle = (id: ID) => {
    const next = selected.has(id) ? groupIds.filter((g) => g !== id) : [...groupIds, id];
    void setGroups(characterId, next);
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const group = await createGroup(trimmed);
      setName('');
      void setGroups(characterId, [...groupIds, group._id]);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="character-groups-editor">
      <div className="flex items-center gap-2">
        <FolderTree className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Groups</p>
      </div>

      {status === 'loading' || (status === 'idle' && groups.length === 0) ? (
        <div className="flex justify-center py-4" role="status" aria-label="Loading groups">
          <Spinner />
        </div>
      ) : status === 'error' ? (
        <ErrorAlert error={error} onRetry={() => void fetchGroups()} />
      ) : groups.length === 0 ? (
        <p className="text-sm text-slate-500">
          No groups yet. Create one to start organising your cast.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5" data-testid="group-toggle-chips">
          {groups.map((g) => {
            const active = selected.has(g._id);
            return (
              <button
                key={g._id}
                type="button"
                onClick={() => toggle(g._id)}
                aria-pressed={active}
                aria-label={`${g.name}${active ? '' : ' — add to group'}`}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors focus:ring-2 focus:ring-indigo-500/50 focus:outline-none ${
                  active
                    ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-200'
                    : 'border-slate-700/60 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                }`}
              >
                {active && <X className="h-3 w-3" aria-hidden="true" />}
                {g.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-1.5">
        <input
          type="text"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleCreate();
            }
          }}
          placeholder="New group name"
          aria-label="New group name"
          className="flex-1 rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-sm text-slate-200 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => void handleCreate()}
          disabled={creating || !name.trim()}
          aria-label="Create group"
          data-testid="create-group-btn"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
