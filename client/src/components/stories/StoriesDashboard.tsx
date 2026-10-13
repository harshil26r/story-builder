import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  BookPlus,
  FileText,
  GitBranch,
  Layers,
  Share2,
  Clock,
  CheckCircle2,
  Users,
  Compass,
  Search,
  Settings,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStoryStore } from '../../store/storyStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { formatRelativeTime, formatWords } from '../../utils/format';
import { AsyncState } from '../ui/AsyncState';
import { SkeletonCard } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { PublishDialog } from './PublishDialog';
import type { StorySummary } from '../../types/domain';

const STRUCTURE_ICON = {
  single: FileText,
  linear: Layers,
  branching: GitBranch,
} as const;

/** Sewn spine seam — encodes the book's binding (branching books are sky-sutured). */
const SEAM: Record<string, string> = {
  single: 'bg-indigo-500/40',
  linear: 'bg-indigo-500/70',
  branching: 'bg-sky-400/70',
};

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function StoriesDashboard() {
  const user = useAuthStore((s) => s.user);
  const stories = useStoryStore((s) => s.stories);
  const status = useStoryStore((s) => s.status);
  const error = useStoryStore((s) => s.error);
  const fetch = useStoryStore((s) => s.fetchList);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const [shareTarget, setShareTarget] = useState<StorySummary | null>(null);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const metrics = useMemo(() => {
    const totalWords = stories.reduce((sum, s) => sum + (s.wordCount || 0), 0);
    const totalChapters = stories.reduce((sum, s) => sum + (s.totalChapters || 0), 0);
    const published = stories.filter((s) => s.isPublic).length;
    const complete = stories.filter((s) => s.status === 'complete').length;
    const drafts = stories.length - complete;
    const completionPct = stories.length ? Math.round((complete / stories.length) * 100) : 0;
    const chart = [...stories]
      .sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0))
      .slice(0, 7);
    return { totalWords, totalChapters, published, complete, drafts, completionPct, chart };
  }, [stories]);

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const maxChartWords = Math.max(1, ...metrics.chart.map((s) => s.wordCount || 0));

  const skeleton = (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );

  const empty = (
    <div className="rounded-2xl border border-slate-200 bg-white py-12 shadow-xs">
      <div className="text-center">
        <div className="relative mx-auto h-20 w-20">
          <div
            className="absolute inset-0 rounded-full bg-indigo-500/10 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200">
            <BookOpen className="h-10 w-10 text-indigo-600" aria-hidden="true" />
          </div>
        </div>
        <p className="mt-4 font-display text-2xl font-bold text-slate-900">
          Your shelf is empty
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Start your first story — share a premise, pick a structure, and watch AI write your book.
        </p>
        <Link to="/stories/new" className="mt-6 inline-block">
          <Button variant="primary" data-testid="create-story-cta">
            <BookPlus className="h-4 w-4" aria-hidden="true" /> Start your first story
          </Button>
        </Link>
      </div>
    </div>
  );

  const quickLinks = [
    {
      label: 'New Story',
      hint: 'Premise to book',
      to: '/create',
      icon: BookPlus,
      tone: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      hover: 'group-hover:text-indigo-600',
    },
    {
      label: 'Explore Books',
      hint: 'Read & get inspired',
      to: '/explore',
      icon: Compass,
      tone: 'bg-cyan-50 text-cyan-600 border-cyan-100',
      hover: 'group-hover:text-cyan-600',
    },
    {
      label: 'Characters',
      hint: 'Cast & personas',
      to: '/characters',
      icon: Users,
      tone: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      hover: 'group-hover:text-emerald-600',
    },
    {
      label: 'Search',
      hint: 'Find anything (⌘K)',
      onClick: () => setSearchOpen(true),
      icon: Search,
      tone: 'bg-amber-50 text-amber-600 border-amber-100',
      hover: 'group-hover:text-amber-600',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* ── Greeting Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {greeting} <span className="text-indigo-600">{user?.name || 'Author'}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {stories.length > 0
              ? `You have ${stories.length} ${stories.length === 1 ? 'manuscript' : 'manuscripts'} · ${formatWords(metrics.totalWords)} written.`
              : 'Your story studio is ready. Start writing whenever you like.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/explore">
            <Button size="sm" variant="outline" data-testid="explore-btn">
              <Compass className="h-4 w-4" aria-hidden="true" /> Explore
            </Button>
          </Link>
          <Link to="/create">
            <Button size="sm" data-testid="new-story-btn">
              <BookPlus className="h-4 w-4" aria-hidden="true" /> + New Story
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Real Metrics ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
              TOTAL WORDS
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600">
              <BookOpen className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              {formatWords(metrics.totalWords)}
            </span>
          </div>
          <p className="mt-1 text-[0.6875rem] text-slate-500">
            Across {stories.length} {stories.length === 1 ? 'manuscript' : 'manuscripts'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
              CHAPTERS WRITTEN
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              {metrics.totalChapters}
            </span>
          </div>
          <p className="mt-1 text-[0.6875rem] text-slate-500">Generated and saved</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
              COMPLETION RATE
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              {metrics.completionPct}%
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-semibold text-slate-600 border border-slate-200">
              {metrics.complete}/{stories.length} done
            </span>
          </div>
          <p className="mt-1 text-[0.6875rem] text-slate-500">
            {metrics.drafts} {metrics.drafts === 1 ? 'draft' : 'drafts'} in progress
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
              PUBLISHED
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600">
              <Share2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              {metrics.published}
            </span>
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-emerald-700 border border-emerald-200">
              Public
            </span>
          </div>
          <p className="mt-1 text-[0.6875rem] text-slate-500">Readable via share link & Explore</p>
        </div>
      </div>

      {/* ── Quick Access ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-500">
            QUICK ACCESS
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            const inner = (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border ${item.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{item.label}</p>
                    <p className="text-[0.6875rem] text-slate-500">{item.hint}</p>
                  </div>
                </div>
                <ArrowUpRight
                  className={`h-3.5 w-3.5 text-slate-400 transition-colors ${item.hover}`}
                />
              </div>
            );
            const cls =
              'group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50';
            return item.to ? (
              <Link key={item.label} to={item.to} className={cls}>
                {inner}
              </Link>
            ) : (
              <button key={item.label} type="button" onClick={item.onClick} className={cls}>
                {inner}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Writing Activity (real) ── */}
      <div id="analytics-section" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              WORDS BY MANUSCRIPT
            </h2>
          </div>

          {stories.length === 0 ? (
            <div className="mt-8 flex h-48 items-center justify-center text-sm text-slate-500">
              No manuscripts yet — your words will chart here.
            </div>
          ) : (
            <div className="mt-8 flex h-48 items-end justify-between gap-3 border-b border-slate-200 px-2 pb-2">
              {metrics.chart.map((story) => (
                <div
                  key={story._id}
                  className="flex flex-1 flex-col items-center gap-2"
                  aria-label={`${story.title}: ${formatWords(story.wordCount || 0)}`}
                  title={story.title}
                >
                  <span className="font-mono text-[0.625rem] text-slate-500">
                    {formatWords(story.wordCount || 0).replace(' words', '').replace(' word', '')}
                  </span>
                  <div
                    className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-indigo-200 via-indigo-500 to-indigo-600 transition-all duration-500 hover:brightness-110"
                    style={{
                      height: `${Math.max(4, ((story.wordCount || 0) / maxChartWords) * 150)}px`,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-right text-[0.625rem] text-slate-500">
            Total words per manuscript, updated live
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              MANUSCRIPT STATUS
            </h2>
            <div className="relative mx-auto my-6 flex h-36 w-36 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-100"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-indigo-600"
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (metrics.completionPct / 100) * 251.2}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute text-center">
                <span className="font-display text-2xl font-bold text-slate-900">
                  {stories.length}
                </span>
                <p className="text-[0.625rem] uppercase tracking-wider text-slate-500">TOTAL</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                <span>Completed</span>
              </div>
              <span className="font-semibold text-slate-900">{metrics.complete}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                <span>Drafts in progress</span>
              </div>
              <span className="font-semibold text-slate-600">{metrics.drafts}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Published</span>
              </div>
              <span className="font-semibold text-slate-600">{metrics.published}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Story Manuscripts Shelf ── */}
      <div id="manuscripts" className="space-y-4 pt-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">
              The work table &middot; {stories.length} {stories.length === 1 ? 'volume' : 'volumes'}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Your story manuscripts
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:flex"
          >
            <Settings className="h-3.5 w-3.5" /> Studio settings
          </button>
        </div>

        <AsyncState
          status={status}
          error={error}
          skeleton={skeleton}
          empty={empty}
          onRetry={() => void fetch()}
          label="Loading stories"
        >
          <div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="stories-grid"
          >
            {stories.map((story) => {
              const Icon = STRUCTURE_ICON[story.structureType];
              const seam = SEAM[story.structureType] ?? SEAM.linear;
              const isPublic = !!story.isPublic;
              return (
                <Link
                  key={story._id}
                  to={`/stories/${story._id}`}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-6 shadow-xs transition-all duration-200 ease-out hover:border-indigo-300 hover:shadow-md"
                  data-testid="story-card"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-[3px] ${seam}`}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="truncate font-display text-lg font-bold leading-snug text-slate-900 transition-colors duration-200 group-hover:text-indigo-600">
                      {story.title}
                    </h3>
                    <span className="flex shrink-0 items-center gap-1.5 pt-1">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${isPublic ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        aria-hidden="true"
                      />
                      <span className="font-mono text-[0.625rem] uppercase tracking-wider text-slate-500">
                        {isPublic ? 'Public' : 'Draft'}
                      </span>
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-wider text-slate-500">
                    {story.totalChapters} {story.totalChapters === 1 ? 'chapter' : 'chapters'}{' '}
                    &middot; {formatWords(story.wordCount)}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-slate-400">
                      <Icon className="h-3 w-3 text-slate-500" aria-hidden="true" />
                      {story.structureType}
                    </span>
                    <span className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Share ${story.title}`}
                        data-testid="share-story-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShareTarget(story);
                        }}
                        className="px-2.5 py-1 text-[0.6875rem]"
                      >
                        <Share2 className="h-3 w-3" aria-hidden="true" />
                        Share
                      </Button>
                      <span className="font-display text-sm italic text-slate-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        Continue &rarr;
                      </span>
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-600">
                    Updated {formatRelativeTime(story.updatedAt)}
                  </p>
                </Link>
              );
            })}
          </div>
        </AsyncState>

        {shareTarget && (
          <PublishDialog story={shareTarget} open onClose={() => setShareTarget(null)} />
        )}
      </div>
    </div>
  );
}
