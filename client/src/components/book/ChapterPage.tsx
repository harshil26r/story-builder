import type { ReactNode } from 'react';

export interface ChapterPageProps {
  order: number;
  title: string;
  content: string;
  /** Extra content below the body (e.g. choice buttons for branching). */
  children?: ReactNode;
  dataReadingMode?: 'night' | 'paper';
  dataGenre?: string;
}

/** Editorial manuscript page: drop cap, justified serif, page number. */
export function ChapterPage({
  order,
  title,
  content,
  children,
  dataReadingMode = 'night',
  dataGenre,
}: ChapterPageProps) {
  const firstLetter = content.trim().charAt(0);
  const rest = content.trim().slice(1);

  return (
    <article
      className="book-page mx-auto max-w-prose rounded-lg border border-slate-800/80 px-8 py-10"
      data-testid="chapter-page"
      data-reading-mode={dataReadingMode}
      data-genre={dataGenre}
      aria-label={`Chapter ${order}`}
    >
      <header className="mb-6 text-center">
        <p
          className="font-mono text-xs uppercase tracking-[0.25em] text-indigo-400"
          data-testid="chapter-order"
        >
          Chapter {order}
        </p>
        <h2
          className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-100"
          data-testid="chapter-title"
        >
          {title || `Chapter ${order}`}
        </h2>
      </header>

      {content.trim() ? (
        <div
          data-testid="chapter-body"
          className="editorial-body text-justify text-slate-200 first-letter:drop-cap [&>p]:mb-4"
        >
          <p>
            <span className="drop-cap" aria-hidden="true">
              {firstLetter}
            </span>
            {rest}
          </p>
          {children}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-slate-500">This chapter is empty.</p>
      )}

      <footer
        className="mt-10 text-center font-mono text-xs text-slate-500"
        data-testid="page-number"
      >
        — {order} —
      </footer>
    </article>
  );
}
