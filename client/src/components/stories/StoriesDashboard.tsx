import { BookOpen, BookPlus, FileText, GitBranch, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { useStoryStore } from "../../store/storyStore";
import { formatRelativeTime, formatWords } from "../../utils/format";
import { AsyncState } from "../ui/AsyncState";
import { SkeletonCard } from "../ui/Skeleton";
import { Button } from "../ui/Button";

const STRUCTURE_ICON = {
  single: FileText,
  linear: Layers,
  branching: GitBranch,
} as const;

export function StoriesDashboard() {
  const stories = useStoryStore((s) => s.stories);
  const status = useStoryStore((s) => s.status);
  const error = useStoryStore((s) => s.error);
  const fetch = useStoryStore((s) => s.fetchList);

  const skeleton = (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );

  const empty = (
    <div className="py-10">
      <div className="text-center">
        <div className="relative mx-auto h-20 w-20">
          <div
            className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/60 ring-1 ring-slate-700/60">
            <BookOpen
              className="h-10 w-10 text-indigo-400"
              aria-hidden="true"
            />
          </div>
        </div>
        <p className="mt-4 text-xl font-semibold text-slate-200">
          Your shelf is empty
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Start your first story — share a premise, pick a structure, and watch
          AI write your book.
        </p>
        <Link to="/stories/new" className="mt-5 inline-block">
          <Button variant="primary" data-testid="create-story-cta">
            <BookPlus className="h-4 w-4" aria-hidden="true" /> Start your first
            story
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 px-4">
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Your stories
          </h1>
          <p className="text-sm text-slate-400">
            Every book begins with a single premise.
          </p>
        </div>
        <Link to="/stories/new">
          <Button size="sm" data-testid="new-story-btn">
            <BookPlus className="h-4 w-4" aria-hidden="true" /> New story
          </Button>
        </Link>
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
            return (
              <Link
                key={story._id}
                to={`/stories/${story._id}`}
                className="group rounded-lg border border-slate-800/80 bg-slate-900/60 p-5 transition-all duration-200 ease-out hover:border-slate-600 hover:shadow-[0_0_24px_rgba(99,102,241,0.12)]"
                data-testid="story-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold tracking-tight text-slate-100 group-hover:text-indigo-300">
                      {story.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Updated {formatRelativeTime(story.updatedAt)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-800/60 px-2 py-0.5 text-xs text-slate-300">
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {story.structureType}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                  <span>
                    {story.totalChapters}{" "}
                    {story.totalChapters === 1 ? "chapter" : "chapters"}
                  </span>
                  <span>·</span>
                  <span>{formatWords(story.wordCount)}</span>
                  <span className="ml-auto">
                    {story.isPublic ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                          aria-hidden="true"
                        />
                        public
                      </span>
                    ) : (
                      <span className="text-slate-500">draft</span>
                    )}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </AsyncState>
    </div>
  );
}
