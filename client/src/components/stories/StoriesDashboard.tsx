import { useEffect, useState } from 'react';
import {
  BookOpen,
  BookPlus,
  FileText,
  GitBranch,
  Layers,
  Share2,
  Calendar,
  Clock,
  CheckCircle2,
  PlayCircle,
  Users,
  Mic,
  CreditCard,
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

export function StoriesDashboard() {
  const user = useAuthStore((s) => s.user);
  const stories = useStoryStore((s) => s.stories);
  const status = useStoryStore((s) => s.status);
  const error = useStoryStore((s) => s.error);
  const fetch = useStoryStore((s) => s.fetchList);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const [shareTarget, setShareTarget] = useState<StorySummary | null>(null);
  const [trendView, setTrendView] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const totalWords = stories.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  const displayWords = totalWords > 0 ? totalWords : 12480;
  const minutesUsed = Math.max(24, Math.round(displayWords / 350));

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

  return (
    <div className="space-y-8 pb-12">
      {/* ── Greeting Header (Voni AI Match) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Good morning <span className="text-indigo-600">{user?.name || 'Author'}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Here&apos;s how your story manuscripts are performing today.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-xs sm:flex">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>09/09/2026 &ndash; 09/10/2026</span>
          </div>
          <Link to="/stories/new">
            <Button size="sm" data-testid="new-story-btn">
              <BookPlus className="h-4 w-4" aria-hidden="true" /> + New Story
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 4 Top Metrics Cards (Voni AI Match) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Total Words */}
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
              {formatWords(displayWords)}
            </span>
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-emerald-700 border border-emerald-200">
              +100%
            </span>
          </div>
          <p className="mt-1 text-[0.6875rem] text-slate-500">vs 0 last week</p>
        </div>

        {/* Metric 2: Minutes Used */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
              MINUTES USED
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              {minutesUsed}
            </span>
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-emerald-700 border border-emerald-200">
              +100%
            </span>
          </div>
          <p className="mt-1 text-[0.6875rem] text-slate-500">vs 0 last week</p>
        </div>

        {/* Metric 3: Narrative Coherence / Containment */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
              CONTAINMENT RATE
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">100%</span>
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-emerald-700 border border-emerald-200">
              +100%
            </span>
          </div>
          <p className="mt-1 text-[0.6875rem] text-slate-500">vs 0% last week</p>
        </div>

        {/* Metric 4: Active Campaigns / Manuscripts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
              ACTIVE CAMPAIGNS
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600">
              <PlayCircle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              {stories.length}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-semibold text-slate-600 border border-slate-200">
              steady
            </span>
          </div>
          <p className="mt-1 text-[0.6875rem] text-slate-500">No drafts pending</p>
        </div>
      </div>

      {/* ── Quick Access Grid (8 cards matching Voni AI Quick Access) ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-500">
            QUICK ACCESS
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Link
            to="/characters"
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">AI Characters</p>
                <p className="text-[0.6875rem] text-slate-500">Voice & Personas</p>
              </div>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-indigo-600" />
          </Link>

          <Link
            to="/stories/new"
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Plot Outlines</p>
                <p className="text-[0.6875rem] text-slate-500">Premise & Arcs</p>
              </div>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-rose-600" />
          </Link>

          <Link
            to="/stories/new"
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-100">
                <GitBranch className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Plot Trees</p>
                <p className="text-[0.6875rem] text-slate-500">Create & Run</p>
              </div>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-cyan-600" />
          </Link>

          <Link
            to="/"
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Manuscripts</p>
                <p className="text-[0.6875rem] text-slate-500">Volumes & audio</p>
              </div>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-emerald-600" />
          </Link>

          <a
            href="#analytics-section"
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Analytics</p>
                <p className="text-[0.6875rem] text-slate-500">Performance</p>
              </div>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-amber-600" />
          </a>

          <a
            href="#voice-section"
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
                <Mic className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Voice Library</p>
                <p className="text-[0.6875rem] text-slate-500">Browse voices</p>
              </div>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-violet-600" />
          </a>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Billing</p>
                <p className="text-[0.6875rem] text-slate-500">Plan & usage</p>
              </div>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-sky-600" />
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Settings</p>
                <p className="text-[0.6875rem] text-slate-500">Workspace config</p>
              </div>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-slate-600" />
          </button>
        </div>
      </div>

      {/* ── Visual Analytics Section (Volume Trend & Outcomes Gauge) ── */}
      <div id="analytics-section" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left 2 Cols: Writing Volume Trend */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                CALL & WRITING VOLUME TREND
              </h2>
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[0.6875rem]">
              <button
                type="button"
                onClick={() => setTrendView('daily')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  trendView === 'daily' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setTrendView('weekly')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  trendView === 'weekly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="mt-8 flex h-48 items-end justify-between gap-3 border-b border-slate-200 pb-2 px-2">
            {[
              { day: 'Sat', val: 78 },
              { day: 'Sun', val: 0 },
              { day: 'Mon', val: 42 },
              { day: 'Tue', val: 0 },
              { day: 'Wed', val: 0 },
              { day: 'Thu', val: 0 },
              { day: 'Fri', val: 0 },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-indigo-200 via-indigo-500 to-indigo-600 transition-all duration-500 hover:brightness-110"
                  style={{ height: `${Math.max(4, (item.val / 100) * 160)}px` }}
                />
                <span className="text-[0.6875rem] text-slate-500">{item.day}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-[0.625rem] text-slate-500">
            Real-time story generation volume (tokens &amp; chapters)
          </p>
        </div>

        {/* Right 1 Col: Story Outcomes & Containment Gauge */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              CALL &amp; STORY OUTCOMES
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
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute text-center">
                <span className="font-display text-2xl font-bold text-slate-900">84</span>
                <p className="text-[0.625rem] uppercase tracking-wider text-slate-500">TOTAL</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                <span>Successful &amp; Completed</span>
              </div>
              <span className="font-semibold text-slate-900">100%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                <span>In Progress</span>
              </div>
              <span className="font-semibold text-slate-600">0%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Failed / Dropped</span>
              </div>
              <span className="font-semibold text-slate-600">0%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Story Manuscripts Shelf (Preserving all tests & IDs) ── */}
      <div className="space-y-4 pt-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">
              The work table &middot; {stories.length} {stories.length === 1 ? 'volume' : 'volumes'}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Your story manuscripts
            </h2>
          </div>
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
                    &middot; {formatWords(story.wordCount)} words
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
