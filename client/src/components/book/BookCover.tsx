import { BookOpen } from 'lucide-react';
import type { ReadingMode } from '../../store/uiStore';
import { Button } from '../ui/Button';

export interface BookCoverProps {
  title: string;
  author?: string | null;
  coverImageUrl?: string | null;
  genre?: string;
  /** Structure badge (e.g. "single", "linear", "branching"). */
  structureType?: string;
  onOpen?: () => void;
  readingMode?: ReadingMode;
}

/** Editorial cover: cover image or gradient placeholder, title, author, CTA. */
export function BookCover({
  title,
  author,
  coverImageUrl,
  genre,
  structureType,
  onOpen,
  readingMode = 'night',
}: BookCoverProps) {
  return (
    <div
      data-testid="book-cover"
      data-reading-mode={readingMode}
      data-genre={genre}
      className="flex flex-col items-center rounded-lg border border-slate-800/80 bg-slate-900/70 p-10 text-center backdrop-blur-sm"
    >
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt={`${title} cover`}
          className="mb-6 max-h-72 w-auto rounded-md object-cover shadow-[var(--shadow-glow)]"
          data-testid="cover-image"
        />
      ) : (
        <div
          className="relative mb-6 flex h-64 w-44 items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 via-violet-600 to-slate-800 shadow-2xl shadow-indigo-900/40"
          data-testid="cover-placeholder"
          aria-hidden="true"
        >
          <BookOpen className="h-10 w-10 text-white/70" />
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400" data-testid="cover-structure">
        {structureType ?? 'story'}
      </p>
      <h1 className="mt-2 max-w-md font-serif text-3xl font-semibold tracking-tight text-slate-100" data-testid="cover-title">
        {title}
      </h1>
      {author ? (
        <p className="mt-2 text-sm text-slate-400" data-testid="cover-author">
          by {author}
        </p>
      ) : null}

      {onOpen && (
        <Button className="mt-8" onClick={onOpen} data-testid="open-book-btn">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Open Book
        </Button>
      )}
    </div>
  );
}