import { Users } from 'lucide-react';
import { useEffect } from 'react';
import type { Character, ID } from '../../../types/domain';
import { useCharacterStore } from '../../../store/characterStore';
import { Spinner } from '../../ui/Spinner';
import { ErrorAlert } from '../../ui/ErrorAlert';
import { initials } from '../../characters/CharacterCard';

export interface CharactersStepProps {
  characterIds: ID[];
  onChange: (ids: ID[]) => void;
}

/** Multiselect of the user's characters (templates included). */
export function CharactersStep({ characterIds, onChange }: CharactersStepProps) {
  const characters = useCharacterStore((s) => s.characters);
  const status = useCharacterStore((s) => s.status);
  const error = useCharacterStore((s) => s.error);
  const fetchCharacters = useCharacterStore((s) => s.fetch);

  useEffect(() => {
    if (characters.length === 0) void fetchCharacters();
  }, [characters.length, fetchCharacters]);

  const toggle = (id: ID) => {
    onChange(characterIds.includes(id) ? characterIds.filter((c) => c !== id) : [...characterIds, id]);
  };

  if (status === 'loading' || (status === 'idle' && characters.length === 0)) {
    return (
      <div className="flex justify-center py-10" role="status" aria-label="Loading characters">
        <Spinner />
      </div>
    );
  }

  if (status === 'error') {
    return <ErrorAlert error={error} onRetry={() => void fetchCharacters()} />;
  }

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center" data-testid="characters-empty">
        <Users className="h-10 w-10 text-slate-600" aria-hidden="true" />
        <div>
          <p className="font-semibold text-slate-200">No characters yet</p>
          <p className="text-sm text-slate-400">
            Add characters first so the AI can weave them into your story.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="characters-step">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Choose characters ({characterIds.length} selected)
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((c: Character) => {
          const active = characterIds.includes(c._id);
          return (
            <button
              key={c._id}
              type="button"
              onClick={() => toggle(c._id)}
              aria-pressed={active}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 ease-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none ${
                active
                  ? 'border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_16px_rgba(99,102,241,0.15)]'
                  : 'border-slate-700/60 bg-slate-900/50 hover:border-slate-600'
              }`}
              data-testid={`character-toggle-${c._id}`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ${
                  active ? 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/40' : 'bg-slate-800 text-slate-300 ring-slate-700'
                }`}
              >
                {initials(c.name)}
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-sm font-medium ${active ? 'text-indigo-200' : 'text-slate-200'}`}>
                  {c.name}
                </span>
                {c.isTemplate && <span className="text-xs text-slate-500">template</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}