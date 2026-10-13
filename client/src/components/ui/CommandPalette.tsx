import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  BookOpen,
  Users,
  PlusCircle,
  Sparkles,
  X,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { useStoryStore } from '../../store/storyStore';
import { useCharacterStore } from '../../store/characterStore';
import { exploreApi } from '../../services/api';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import type { ExploreStory } from '../../types/api';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const stories = useStoryStore((s) => s.stories);
  const characters = useCharacterStore((s) => s.characters);
  const [community, setCommunity] = useState<ExploreStory[]>([]);
  const [communityStatus, setCommunityStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );

  // Server-backed search across published books (Explore catalog), debounced so
  // typing doesn't hammer the API. Results augment the local story/character hits.
  const runExploreSearch = useDebouncedCallback((value: string) => {
    const term = value.trim();
    if (term.length < 2) {
      setCommunity([]);
      setCommunityStatus('idle');
      return;
    }
    setCommunityStatus('loading');
    exploreApi
      .list({ q: term, limit: 5 })
      .then((res) => {
        setCommunity(res.stories);
        setCommunityStatus('success');
      })
      .catch(() => {
        setCommunity([]);
        setCommunityStatus('error');
      });
  }, 300);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setCommunity([]);
      setCommunityStatus('idle');
    }
  }, [open]);

  if (!open) return null;

  const filteredStories = stories.filter((s) =>
    s.title.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (url: string) => {
    onClose();
    navigate(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command search palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-sm sm:pt-28"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-slate-800 px-4 py-3">
          <Search className="h-5 w-5 text-indigo-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              runExploreSearch(e.target.value);
            }}
            placeholder="Search stories, characters, chapters, quick commands..."
            className="ml-3 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="mr-2 text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {/* Quick Actions */}
          <div className="mb-2 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-wider text-slate-500">
            Quick Actions
          </div>
          <button
            onClick={() => handleSelect('/stories/new')}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-indigo-600/15 hover:text-indigo-300"
          >
            <div className="flex items-center gap-2.5">
              <PlusCircle className="h-4 w-4 text-indigo-400" />
              <span>Create New Story Manuscript</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
          </button>
          <button
            onClick={() => handleSelect('/characters/new')}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-indigo-600/15 hover:text-indigo-300"
          >
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-emerald-400" />
              <span>Create New Character</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
          </button>
          <button
            onClick={() => handleSelect('/explore')}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-indigo-600/15 hover:text-indigo-300"
          >
            <div className="flex items-center gap-2.5">
              <Compass className="h-4 w-4 text-cyan-400" />
              <span>Explore Published Books</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
          </button>

          {/* Stories */}
          {filteredStories.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-wider text-slate-500">
                Stories ({filteredStories.length})
              </div>
              {filteredStories.map((story) => (
                <button
                  key={story._id}
                  onClick={() => handleSelect(`/stories/${story._id}`)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 text-indigo-400" />
                    <span className="font-medium text-slate-200">{story.title}</span>
                    <span className="text-xs text-slate-500">
                      &middot; {story.totalChapters} chapters
                    </span>
                  </div>
                  <span className="text-xs text-indigo-400">Open &rarr;</span>
                </button>
              ))}
            </div>
          )}

          {/* Characters */}
          {filteredCharacters.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-wider text-slate-500">
                Characters ({filteredCharacters.length})
              </div>
              {filteredCharacters.map((char) => (
                <button
                  key={char._id}
                  onClick={() => handleSelect(`/characters/${char._id}`)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[0.625rem] font-bold text-slate-300">
                      {char.name.charAt(0)}
                    </span>
                    <span className="font-medium text-slate-200">{char.name}</span>
                    <span className="text-xs text-slate-500">&middot; {char.role}</span>
                  </div>
                  <span className="text-xs text-emerald-400">Edit &rarr;</span>
                </button>
              ))}
            </div>
          )}

          {/* Community books (server-backed Explore search) */}
          {query.trim().length >= 2 && (
            <div className="mt-3">
              <div className="mb-1 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-wider text-slate-500">
                Community Books
              </div>
              {communityStatus === 'loading' && community.length === 0 && (
                <div className="px-3 py-2 text-sm text-slate-500">Searching published books…</div>
              )}
              {communityStatus === 'error' && (
                <div className="px-3 py-2 text-sm text-slate-500">
                  Couldn&rsquo;t reach Explore. Try again.
                </div>
              )}
              {community.map((story) => (
                <button
                  key={story._id}
                  onClick={() =>
                    handleSelect(story.shareToken ? `/s/${story.shareToken}` : '/explore')
                  }
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Compass className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="truncate font-medium text-slate-200">{story.title}</span>
                    <span className="shrink-0 text-xs text-slate-500">&middot; {story.genre}</span>
                  </div>
                  <span className="shrink-0 text-xs text-cyan-400">Read &rarr;</span>
                </button>
              ))}
              <button
                onClick={() => handleSelect(`/explore?q=${encodeURIComponent(query.trim())}`)}
                className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-indigo-300 hover:bg-indigo-600/15"
              >
                <span>Search all published books for &ldquo;{query.trim()}&rdquo;</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {query &&
            filteredStories.length === 0 &&
            filteredCharacters.length === 0 &&
            community.length === 0 &&
            communityStatus !== 'loading' && (
              <div className="py-8 text-center text-sm text-slate-500">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/60 px-4 py-2 text-[0.6875rem] text-slate-500">
          <span>
            Press <kbd className="rounded bg-slate-800 px-1 text-slate-400">ESC</kbd> to close
          </span>
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Sparkles className="h-3 w-3" />
            <span>Story Writer AI Command Hub</span>
          </div>
        </div>
      </div>
    </div>
  );
}
