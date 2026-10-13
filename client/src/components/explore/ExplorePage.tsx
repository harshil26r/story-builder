import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Compass,
  FileText,
  GitBranch,
  Layers,
  Loader2,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { exploreApi } from '../../services/api';
import type { ExploreStory, ExploreSort } from '../../types/api';
import type { AsyncStatus, StructureType } from '../../types/domain';
import { AsyncState } from '../ui/AsyncState';
import { SkeletonCard } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { formatWords } from '../../utils/format';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';

const STRUCTURE_ICON = {
  single: FileText,
  linear: Layers,
  branching: GitBranch,
} as const;

const STRUCTURE_LABEL: Record<StructureType, string> = {
  single: 'Short story',
  linear: 'Chaptered',
  branching: 'Branching',
};

const GENRES = [
  'fantasy',
  'sci-fi',
  'mystery',
  'romance',
  'thriller',
  'horror',
  'historical',
  'adventure',
  'literary',
  'young-adult',
  'non-fiction',
];

const SORTS: { value: ExploreSort; label: string }[] = [
  { value: 'recent', label: 'Recently updated' },
  { value: 'words', label: 'Most words' },
  { value: 'chapters', label: 'Most chapters' },
];

const PAGE_SIZE = 12;

/** Public discovery: search, filter, read, and draw inspiration from published books. */
export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [genre, setGenre] = useState(searchParams.get('genre') ?? '');
  const [structureType, setStructureType] = useState<StructureType | ''>('');
  const [sort, setSort] = useState<ExploreSort>('recent');
  const [page, setPage] = useState(1);
  const [stories, setStories] = useState<ExploreStory[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [error, setError] = useState<Error | null>(null);

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setQuery(value);
    setPage(1);
  }, 350);

  const prevSortRef = useRef(sort);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      setStatus(append ? 'success' : 'loading');
      try {
        const res = await exploreApi.list({
          q: query,
          genre,
          structureType: structureType || undefined,
          sort,
          page: targetPage,
          limit: PAGE_SIZE,
        });
        setStories((prev) => (append ? [...prev, ...res.stories] : res.stories));
        setTotal(res.total);
        setHasMore(res.hasMore);
        if (!append) {
          setStatus(res.stories.length === 0 ? 'empty' : 'success');
        } else {
          setStatus('success');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Could not load books.'));
        setStatus('error');
      }
    },
    [query, genre, structureType, sort],
  );

  useEffect(() => {
    void load(1, false);
    setPage(1);
  }, [load]);

  useEffect(() => {
    if (prevSortRef.current !== sort) {
      prevSortRef.current = sort;
      setPage(1);
    }
  }, [sort]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (genre) params.set('genre', genre);
    setSearchParams(params, { replace: true });
  }, [query, genre, setSearchParams]);

  const resetFilters = () => {
    setQuery('');
    setGenre('');
    setStructureType('');
    setSort('recent');
  };

  const filterBar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex-1">
        <span className="sr-only">Search published books</span>
        <span className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            defaultValue={query}
            onChange={(e) => debouncedSearch(e.target.value)}
            placeholder="Search by title, premise, or genre…"
            aria-label="Search published books"
            data-testid="explore-search"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
          />
        </span>
      </label>

      <label className="sm:w-40">
        <span className="mb-1 block font-mono text-[0.625rem] uppercase tracking-wider text-slate-500">
          Genre
        </span>
        <select
          value={genre}
          onChange={(e) => {
            setGenre(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by genre"
          data-testid="explore-genre"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
        >
          <option value="">All genres</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>

      <label className="sm:w-40">
        <span className="mb-1 block font-mono text-[0.625rem] uppercase tracking-wider text-slate-500">
          Structure
        </span>
        <select
          value={structureType}
          onChange={(e) => {
            setStructureType(e.target.value as StructureType | '');
            setPage(1);
          }}
          aria-label="Filter by structure"
          data-testid="explore-structure"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
        >
          <option value="">Any structure</option>
          {(Object.keys(STRUCTURE_LABEL) as StructureType[]).map((s) => (
            <option key={s} value={s}>
              {STRUCTURE_LABEL[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="sm:w-44">
        <span className="mb-1 block font-mono text-[0.625rem] uppercase tracking-wider text-slate-500">
          Sort
        </span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as ExploreSort)}
          aria-label="Sort results"
          data-testid="explore-sort"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  const skeleton = (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );

  const empty = (
    <div
      className="rounded-2xl border border-slate-200 bg-white py-14 text-center shadow-xs"
      data-testid="explore-empty"
    >
      <div className="relative mx-auto h-16 w-16">
        <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50">
          <Compass className="h-8 w-8 text-cyan-600" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 font-display text-xl font-bold text-slate-900">No books found</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
        {query || genre || structureType
          ? 'Try a different search or clear your filters.'
          : 'No books have been published to Explore yet. Be the first!'}
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        {(query || genre || structureType) && (
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        )}
        <Link to="/create">
          <Button size="sm">
            <Wand2 className="h-4 w-4" aria-hidden="true" /> Write a book
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">The public shelf</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Explore books
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Read what others have published — then remix an idea into a story of your own.
          </p>
        </div>
        <Link to="/create">
          <Button size="sm" data-testid="explore-create-btn">
            <Wand2 className="h-4 w-4" aria-hidden="true" /> Write a book
          </Button>
        </Link>
      </div>

      {filterBar}

      <AsyncState
        status={status}
        error={error}
        skeleton={skeleton}
        empty={empty}
        onRetry={() => void load(1, false)}
        label="Loading books"
      >
        <div className="space-y-6">
          <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-slate-500">
            {total} {total === 1 ? 'book' : 'books'}
          </p>
          <div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="explore-grid"
          >
            {stories.map((story) => {
              const Icon = STRUCTURE_ICON[story.structureType];
              const canRead = !!story.shareToken;
              return (
                <article
                  key={story._id}
                  data-testid="explore-card"
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition-all duration-200 ease-out hover:border-cyan-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3 p-5 pb-3">
                    <h2 className="font-display text-lg font-bold leading-snug text-slate-900">
                      {story.title}
                    </h2>
                    <span className="shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider text-cyan-700">
                      {story.genre}
                    </span>
                  </div>
                  {story.premise && (
                    <p className="line-clamp-3 px-5 text-sm leading-relaxed text-slate-600">
                      {story.premise}
                    </p>
                  )}
                  <div className="mt-3 px-5">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-slate-400">
                      <Icon className="h-3 w-3 text-slate-500" aria-hidden="true" />
                      {STRUCTURE_LABEL[story.structureType]} · {story.totalChapters}{' '}
                      {story.totalChapters === 1 ? 'chapter' : 'chapters'} ·{' '}
                      {formatWords(story.wordCount)}
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-2 border-t border-slate-200 p-4">
                    {canRead ? (
                      <Link to={`/s/${story.shareToken}`} className="flex-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full"
                          aria-label={`Read ${story.title}`}
                        >
                          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Read
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" variant="secondary" className="flex-1" disabled>
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Read
                      </Button>
                    )}
                    <Link
                      to="/stories/new"
                      state={{
                        preset: {
                          genre: story.genre,
                          tone: story.tone,
                          targetAudience: story.targetAudience,
                          structureType: story.structureType,
                          generationMode: 'ai-enhanced',
                        },
                        inspiration: { title: story.title, premise: story.premise },
                      }}
                      className="flex-1"
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        aria-label={`Use ${story.title} as inspiration`}
                        data-testid="explore-remix-btn"
                      >
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Remix
                      </Button>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  void load(next, true);
                }}
                data-testid="explore-load-more"
              >
                <Loader2 className="h-4 w-4" aria-hidden="true" /> Load more
              </Button>
            </div>
          )}
        </div>
      </AsyncState>
    </div>
  );
}
