import { useEffect, useState } from 'react';
import { Users, PlusCircle, FolderTree, Plus, Trash2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ID } from '../../types/domain';
import { useCharacterStore } from '../../store/characterStore';
import { CharacterCard } from './CharacterCard';
import { AsyncState } from '../ui/AsyncState';
import { SkeletonCard } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { confirm } from '../ui/confirm';

export function CharactersDashboard() {
  const characters = useCharacterStore((s) => s.characters);
  const status = useCharacterStore((s) => s.status);
  const error = useCharacterStore((s) => s.error);
  const fetch = useCharacterStore((s) => s.fetch);
  const groups = useCharacterStore((s) => s.groups);
  const fetchGroups = useCharacterStore((s) => s.fetchGroups);
  const createGroup = useCharacterStore((s) => s.createGroup);
  const removeGroup = useCharacterStore((s) => s.removeGroup);

  const [activeGroupId, setActiveGroupId] = useState<ID | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void fetch();
    void fetchGroups();
  }, [fetch, fetchGroups]);

  const activeGroup = groups.find((g) => g._id === activeGroupId) ?? null;
  const filteredByGroup = activeGroupId
    ? characters.filter((c) => c.groupIds.includes(activeGroupId))
    : characters;

  const filtered = searchQuery.trim()
    ? filteredByGroup.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.backstory?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : filteredByGroup;

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const group = await createGroup(name);
      setNewGroupName('');
      setActiveGroupId(group._id);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = (id: ID) => {
    void confirm({
      title: 'Delete group?',
      message: 'Characters in this group are not deleted — only the group is removed.',
      danger: true,
      confirmLabel: 'Delete',
    }).then((ok) => {
      if (!ok) return;
      if (activeGroupId === id) setActiveGroupId(null);
      void removeGroup(id);
    });
  };

  const skeleton = (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="characters-skeleton"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );

  const empty = (
    <div className="rounded-2xl border border-slate-200 bg-white py-12 shadow-xs">
      <div className="text-center">
        <div className="relative mx-auto h-16 w-16">
          <div
            className="absolute inset-0 rounded-full bg-indigo-500/10 blur-xl"
            aria-hidden="true"
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200">
            <Users className="h-8 w-8 text-indigo-600" aria-hidden="true" />
          </div>
        </div>
        {characters.length === 0 ? (
          <>
            <p className="mt-4 font-display text-2xl font-bold text-slate-900">
              The cast is empty
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              No characters yet. Bring your cast to life &mdash; create your first character.
            </p>
            <Link to="/characters/new" className="mt-5 inline-block">
              <Button variant="primary" data-testid="create-character-cta">
                <PlusCircle className="h-4 w-4" aria-hidden="true" /> Create character
              </Button>
            </Link>
          </>
        ) : (
          <>
            <p className="mt-4 font-display text-2xl font-bold text-slate-900">
              No characters in this group yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Assign characters from their edit page to add them to &ldquo;{activeGroup?.name}
              &rdquo;.
            </p>
          </>
        )}
      </div>
    </div>
  );

  const onRetry = () => void fetch();

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">
            The cast &middot; {filtered.length} {filtered.length === 1 ? 'character' : 'characters'}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Characters
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Your cast of AI narrative personas, ready for any story.
          </p>
        </div>
        <Link to="/characters/new">
          <Button size="sm" data-testid="new-character-btn">
            <PlusCircle className="h-4 w-4" aria-hidden="true" /> New character
          </Button>
        </Link>
      </div>

      {/* ── Search & Filter Toolbar (Voni AI Match) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search characters by name, role, backstory..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[0.6875rem] text-slate-700">
            {filtered.length} {filtered.length === 1 ? 'AGENT' : 'AGENTS'}
          </span>
        </div>
      </div>

      {/* ── Groups Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <FolderTree className="h-3.5 w-3.5" aria-hidden="true" /> Groups:
        </span>

        <button
          type="button"
          onClick={() => setActiveGroupId(null)}
          aria-pressed={activeGroupId === null}
          data-testid="group-filter-chip"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
            activeGroupId === null
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          All ({characters.length})
        </button>

        {groups.map((group) => {
          const count = characters.filter((c) => c.groupIds.includes(group._id)).length;
          const isSelected = activeGroupId === group._id;
          return (
            <div key={group._id} className="flex items-center">
              <button
                type="button"
                onClick={() => setActiveGroupId(group._id)}
                aria-pressed={isSelected}
                data-testid="group-filter-chip"
                className={`rounded-l-full px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'border border-r-0 border-slate-700/60 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                }`}
              >
                {group.name} ({count})
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGroup(group._id)}
                aria-label="Delete group"
                data-testid="delete-group-btn"
                className={`rounded-r-full px-2 py-1 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isSelected
                    ? 'bg-indigo-700 text-indigo-200 hover:bg-indigo-800'
                    : 'border border-l-0 border-slate-700/60 bg-slate-800/60 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300'
                }`}
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          );
        })}

        <div className="flex items-center gap-1 pl-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="New group name"
            aria-label="New group name"
            className="w-32 rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleCreateGroup();
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleCreateGroup()}
            loading={creating}
            disabled={!newGroupName.trim()}
            aria-label="Add group"
            className="px-2 py-1 text-xs"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* ── Characters Grid (Async State) ── */}
      <AsyncState
        status={status === 'success' && filtered.length === 0 ? 'empty' : status}
        error={error}
        skeleton={skeleton}
        empty={empty}
        onRetry={onRetry}
        label="Loading characters"
      >
        <div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="characters-grid"
        >
          {filtered.map((character) => (
            <CharacterCard key={character._id} character={character} groups={groups} />
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
