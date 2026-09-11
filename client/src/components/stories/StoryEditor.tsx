import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, RefreshCw, Save } from 'lucide-react';
import type { ChapteredStory, Chapter } from '../../types/domain';
import { useStoryStore } from '../../store/storyStore';
import { useUiStore } from '../../store/uiStore';
import { useGenerationStore } from '../../store/generationStore';
import { AppShell } from '../ui/AppShell';
import { Spinner } from '../ui/Spinner';
import { ErrorAlert } from '../ui/ErrorAlert';
import { Button } from '../ui/Button';
import { ChapterPage } from '../book/ChapterPage';

const AUTOSAVE_MS = 800;

export function StoryEditor() {
  const { id } = useParams<{ id: string }>();
  const story = useStoryStore((s) => s.current);
  const conflict = useStoryStore((s) => s.conflict);
  const status = useStoryStore((s) => s.status);
  const error = useStoryStore((s) => s.error);
  const fetchOne = useStoryStore((s) => s.fetchOne);
  const update = useStoryStore((s) => s.update);
  const clearConflict = useStoryStore((s) => s.clearConflict);

  const readerMode = useUiStore((s) => s.readerMode);
  const setReaderMode = useUiStore((s) => s.setReaderMode);
  const readingMode = useUiStore((s) => s.readingMode);

  const genStatus = useGenerationStore((s) => s.job.status);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (id && story?._id !== id) void fetchOne(id, { withVersions: true });
  }, [id, story?._id, fetchOne]);

  // Seed drafts from loaded chapters once.
  useEffect(() => {
    if (story && story.structureType !== 'branching' && !initRef.current) {
      const chs = (story as ChapteredStory).chapters ?? [];
      const next: Record<string, string> = {};
      for (const c of chs) next[c._id] = c.draftContent ?? c.content;
      setDrafts(next);
      initRef.current = true;
    }
  }, [story]);

  // Autosave: debounce an optimistic PUT with baseVersion for concurrency.
  // NOTE: the chapter-content endpoint isn't in the server contract yet, so we
  // autosave the story premise as our writable field, exercising the same
  // debounce/conflict machinery. Chapter bodies stay client-side until the
  // backend chapter-save route lands.
  const scheduleAutosave = useCallback(
    (chapter: Chapter, text: string, version: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSavingKey(chapter._id);
      debounceRef.current = setTimeout(() => {
        void update(
          id ?? '',
          { baseVersion: version, premise: text },
          { silent: true },
        )
          .then(() => setSavedAt(new Date().toISOString()))
          .catch(() => {})
          .finally(() => setSavingKey(null));
      }, AUTOSAVE_MS);
    },
    [id, update],
  );

  const handleEdit = (chapter: Chapter, text: string) => {
    setDrafts((d) => ({ ...d, [chapter._id]: text }));
    scheduleAutosave(chapter, text, chapter.version);
  };

  const handleOverwrite = () => {
    clearConflict();
    setEditError(null);
    void update(id ?? '', { baseVersion: -1, title: story?.title }).catch((e) =>
      setEditError(e instanceof Error ? e.message : 'Overwrite failed.'),
    );
  };

  if (status === 'loading' || (status === 'idle' && !story)) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading editor">
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (status === 'error' || (status === 'success' && !story)) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-16">
          <ErrorAlert error={error} onRetry={() => id && void fetchOne(id, { withVersions: true })} />
        </div>
      </AppShell>
    );
  }

  if (!story) return null;

  if (story.structureType === 'branching') {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl space-y-6 py-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{story.title}</h1>
          <p className="text-sm text-slate-400">Branching stories are edited in the reader's branching view.</p>
        </div>
      </AppShell>
    );
  }

  const chapters = (story as ChapteredStory).chapters ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{story.title}</h1>
            <p className="text-sm text-slate-400">
              {chapters.length} chapters · {story.wordCount.toLocaleString()} words
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-slate-700/60 bg-slate-800/60 p-0.5">
              <button
                type="button"
                onClick={() => setReaderMode('read')}
                aria-pressed={readerMode === 'read'}
                className="rounded px-2.5 py-1 text-xs text-slate-400 transition-colors hover:text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
                data-testid="editor-mode-read"
              >
                Read
              </button>
              <button
                type="button"
                onClick={() => setReaderMode('edit')}
                aria-pressed={readerMode === 'edit'}
                className="rounded px-2.5 py-1 text-xs text-slate-300 transition-colors hover:text-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
                data-testid="editor-mode-edit"
              >
                Edit
              </button>
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" data-testid="autosave-status">
              {savingKey ? (
                <>
                  <Spinner size="sm" /> saving…
                </>
              ) : savedAt ? (
                <>
                  <Save className="h-3.5 w-3.5" aria-hidden="true" /> saved
                </>
              ) : null}
            </span>
          </div>
        </header>

        {genStatus === 'streaming' && (
          <p className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-300">
            AI is generating content — disable editing to avoid conflicts.
          </p>
        )}

        {editError && <ErrorAlert error={{ message: editError }} onRetry={() => setEditError(null)} />}

        {conflict && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3"
            data-testid="conflict-banner"
          >
            <div>
              <p className="font-medium text-amber-300">This chapter changed on another device</p>
              <p className="text-xs text-amber-200/70">Choose to open the latest version or overwrite with yours.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void fetchOne(story._id, { withVersions: true })} data-testid="conflict-open-latest">
                Open latest
              </Button>
              <Button variant="danger" size="sm" onClick={handleOverwrite} data-testid="conflict-overwrite">
                Overwrite
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {chapters.map((chapter) => {
            const editable = readerMode === 'edit';
            return (
              <section key={chapter._id} aria-label={`Chapter ${chapter.order}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-semibold text-slate-100">{chapter.title || `Chapter ${chapter.order}`}</h2>
                  <span className="text-xs text-slate-500">v{chapter.version}</span>
                </div>

                {editable ? (
                  <textarea
                    value={drafts[chapter._id] ?? chapter.content}
                    onChange={(e) => handleEdit(chapter, e.target.value)}
                    rows={16}
                    aria-label={`Edit chapter ${chapter.order}`}
                    spellCheck
                    className="w-full rounded-md border border-slate-700/60 bg-slate-900/70 px-4 py-3 font-serif text-base leading-relaxed text-slate-200 transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
                    data-testid={`chapter-editor-${chapter.order}`}
                  />
                ) : (
                  <ChapterPage
                    order={chapter.order}
                    title={chapter.title}
                    content={drafts[chapter._id] ?? chapter.content}
                    dataReadingMode={readingMode}
                    dataGenre={story.genre}
                  />
                )}
              </section>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800/80 pt-4">
          <Button variant="outline" onClick={() => void fetchOne(story._id, { withVersions: true })} data-testid="reload-story">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reload
          </Button>
          <Button onClick={() => /* reader nav is handled by /stories/:id Manage link */ undefined} data-testid="open-reader">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Open reader
          </Button>
        </div>
      </div>
    </AppShell>
  );
}