import { Users, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCharacterStore } from '../../store/characterStore';
import { CharacterCard } from './CharacterCard';
import { AsyncState } from '../ui/AsyncState';
import { SkeletonCard } from '../ui/Skeleton';
import { Button } from '../ui/Button';

export function CharactersDashboard() {
  const characters = useCharacterStore((s) => s.characters);
  const status = useCharacterStore((s) => s.status);
  const error = useCharacterStore((s) => s.error);
  const fetch = useCharacterStore((s) => s.fetch);

  const skeleton = (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="characters-skeleton">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );

  const empty = (
    <div className="py-8">
      <div className="text-center">
        <Users className="mx-auto h-12 w-12 text-slate-600" aria-hidden="true" />
        <p className="mt-3 text-xl font-semibold text-slate-300">The cast is empty</p>
        <p className="mt-2 text-slate-500">No characters yet. Bring your cast to life — create your first character.</p>
        <Link to="/characters/new" className="mt-4 inline-block">
          <Button variant="primary" data-testid="create-character-cta">
            <PlusCircle className="h-4 w-4" aria-hidden="true" /> Create character
          </Button>
        </Link>
      </div>
    </div>
  );

  const onRetry = () => void fetch();

  return (
    <div className="space-y-6 px-4">
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Characters</h1>
          <p className="text-sm text-slate-400">Your cast, ready for any story.</p>
        </div>
        <Link to="/characters/new">
          <Button variant="primary" size="sm" data-testid="add-character-btn">
            <PlusCircle className="h-4 w-4" aria-hidden="true" /> Add character
          </Button>
        </Link>
      </div>

      <AsyncState
        status={status}
        error={error}
        skeleton={skeleton}
        empty={empty}
        onRetry={onRetry}
        label="Loading characters"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="characters-grid">
          {characters.map((character) => (
            <CharacterCard key={character._id} character={character} />
          ))}
        </div>
      </AsyncState>
    </div>
  );
}