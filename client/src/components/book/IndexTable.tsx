import { Clock, ListOrdered } from 'lucide-react';
import type { Chapter } from '../../types/domain';

export interface IndexTableProps {
  chapters: Pick<Chapter, '_id' | 'order' | 'title' | 'summary'>[];
  onNavigate: (order: number) => void;
  currentOrder?: number;
}

const WORDS_PER_MINUTE = 220;

function estimateReadMin(chapters: IndexTableProps['chapters']): number {
  const words = chapters.reduce(
    (acc, c) => acc + ((c.summary ?? '').match(/\S+/g)?.length ?? 0) * 0,
    0,
  );
  // Summaries are too short to estimate from; fall back to a flat estimate.
  void words;
  const count = chapters.length;
  if (count === 0) return 0;
  return Math.max(1, Math.round((count * 1200) / WORDS_PER_MINUTE));
}

export function IndexTable({ chapters, onNavigate, currentOrder }: IndexTableProps) {
  const readMin = estimateReadMin(chapters);

  return (
    <section aria-label="Table of contents" className="mx-auto max-w-xl" data-testid="index-table">
      <header className="mb-6 text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
          <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
          Contents
        </p>
        <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-100">
          Table of Contents
        </h2>
        {chapters.length > 0 && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'} · ~{readMin} min read
          </p>
        )}
      </header>

      {chapters.length === 0 ? (
        <p className="text-center text-sm text-slate-500">No chapters yet.</p>
      ) : (
        <ol className="space-y-1">
          {chapters.map((ch) => {
            const active = currentOrder === ch.order;
            return (
              <li key={ch._id}>
                <button
                  type="button"
                  onClick={() => onNavigate(ch.order)}
                  aria-current={active ? 'true' : undefined}
                  aria-label={`Chapter ${ch.order}: ${ch.title}`}
                  className={`group flex w-full items-center gap-4 rounded-md border px-4 py-3 text-left transition-all duration-200 ease-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none ${
                    active
                      ? 'border-l-4 border-l-indigo-500 border-slate-700/60 bg-indigo-500/10'
                      : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-600'
                  }`}
                  data-testid={`index-row-${ch.order}`}
                >
                  <span className="w-8 shrink-0 text-center font-mono text-sm text-slate-500">
                    {ch.order}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium text-slate-200 group-hover:text-indigo-300">
                      {ch.title || `Chapter ${ch.order}`}
                    </span>
                    {ch.summary && (
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {ch.summary}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
