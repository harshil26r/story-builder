import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, RefreshCw, Save } from 'lucide-react';
import type { ChapteredStory, Chapter } from '../../types/domain';
import { useStoryStore } from '../../store/storyStore';
import { useUiStore } from '../../store/uiStore';
import { useGenerationStore } from '../../store/generationStore';
import { storiesApi } from '../../services/api';
import { Spinner } from '../ui/Spinner';
import { ErrorAlert } from '../ui/ErrorAlert';
import { Button } from '../ui/Button';
import { ChapterPage } from '../book/ChapterPage';
import { RegenerateDialog } from './RegenerateDialog';

const AUTOSAVE_MS = 800;

function isConflict(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'CONFLICT';
}

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
  const [chapterConflict, setChapterConflict] = useState<{ chapterId: string } | null>(null);
  const [pendingPatch, setPendingPatch] = useState<{
    chapter: Chapter;
    text: string;
    version: number;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);
  const latestVersionRef = useRef<Record<string, number>>({});
  const [regenerateTarget, setRegenerateTarget] = useState<{
    chapterId: string;
    order: number;
    version: number;
  } | null>(null);

  useEffect(() => {
    if (id && story?._id !== id) void fetchOne(id, { withVersions: true });
  }, [id, story?._id, fetchOne]);

  // Seed drafts from loaded chapters once.
  useEffect(() => {
    if (story && story.structureType !== 'branching' && !initRef.current) {
      const chs = (story as ChapteredStory).chapters ?? [];
      const next: Record<string, string> = {};
      const versions: Record<string, number> = {};
      for (const c of chs) {
        next[c._id] = c.draftContent ?? c.content;
        versions[c._id] = c.version;
      }
      setDrafts(next);
      latestVersionRef.current = versions;
      initRef.current = true;
    }
  }, [story]);

  const persistPatch = useCallback(
    (patch: { chapter: Chapter; text: string; version: number }) => {
      setSavingKey(patch.chapter._id);
      storiesApi
        .saveChapter(id ?? '', patch.chapter._id, {
          content: patch.text,
          baseVersion: patch.version,
        })
        .then(({ chapter }) => {
          latestVersionRef.current[chapter._id] = chapter.version;
          setEditError(null);
          setChapterConflict(null);
          setSavedAt(new Date().toISOString());
        })
        .catch((e: unknown) => {
          if (isConflict(e)) {
            setChapterConflict({ chapterId: patch.chapter._id });
            setEditError(null);
          } else {
            setEditError(e instanceof Error ? e.message : 'Autosave failed.');
          }
        })
        .finally(() => setSavingKey(null));
    },
    [id],
  );

  // Autosave: debounce chapter-content edits to the chapter-save endpoint.
  // Optimistic concurrency carries baseVersion (latest known chapter.version);
  // a real 409 CONFLICT from the server now drives the conflict banner
  // (SPEC §3.6 / §4.4).
  const scheduleAutosave = useCallback(
    (chapter: Chapter, text: string, version: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const patch = { chapter, text, version };
      setPendingPatch(patch);
      setChapterConflict(null);
      setEditError(null);
      setSavedAt(null);
      setSavingKey(chapter._id);
      debounceRef.current = setTimeout(() => {
        void persistPatch(patch);
      }, AUTOSAVE_MS);
    },
    [persistPatch],
  );

  const handleEdit = (chapter: Chapter, text: string) => {
    setDrafts((d) => ({ ...d, [chapter._id]: text }));
    const version = latestVersionRef.current[chapter._id] ?? chapter.version;
    scheduleAutosave(chapter, text, version);
  };

  const handleOpenLatest = () => {
    setChapterConflict(null);
    setEditError(null);
    setSavedAt(null);
    if (id) void fetchOne(id, { withVersions: true });
  };

  const handleOverwrite = () => {
    clearConflict();
    setChapterConflict(null);
    setEditError(null);
    if (pendingPatch) {
      void persistPatch({ ...pendingPatch, version: -1 });
    } else {
      void update(id ?? '', { baseVersion: -1, title: story?.title }).catch((e) =>
        setEditError(e instanceof Error ? e.message : 'Overwrite failed.'),
      );
    }
  };

  const handleRetry = () => {
    setEditError(null);
    if (pendingPatch) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void persistPatch(pendingPatch);
    }
  };

  if (status === 'loading' || (status === 'idle' && !story)) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-label="Loading editor"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === 'error' || (status === 'success' && !story)) {
    return (
      <div className="mx-auto max-w-md py-16">
        <ErrorAlert error={error} onRetry={() => id && void fetchOne(id, { withVersions: true })} />
      </div>
    );
  }

  if (!story) return null;

  if (story.structureType === 'branching') {
    return (
      <div className="mx-auto max-w-4xl space-y-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{story.title}</h1>
        <p className="text-sm text-slate-400">
          Branching stories are edited in the reader's branching view.
        </p>
      </div>
    );
  }

  const chapters = (story as ChapteredStory).chapters ?? [];

  return (
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

          <span
            className="inline-flex items-center gap-1.5 text-xs text-slate-500"
            data-testid="autosave-status"
          >
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

      {editError && <ErrorAlert error={{ message: editError }} onRetry={handleRetry} />}

      {(conflict || chapterConflict) && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3"
          data-testid="conflict-banner"
        >
          <div>
            <p className="font-medium text-amber-300">This chapter changed on another device</p>
            <p className="text-xs text-amber-200/70">
              Choose to open the latest version or overwrite with yours.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenLatest}
              data-testid="conflict-open-latest"
            >
              Open latest
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleOverwrite}
              data-testid="conflict-overwrite"
            >
              Overwrite
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {chapters.map((chapter) => {
          const editable = readerMode === 'edit';
          return (
            <section
              key={chapter._id}
              aria-label={`Chapter ${chapter.order}`}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold text-slate-100">
                  {chapter.title || `Chapter ${chapter.order}`}
                </h2>
                <div className="flex items-center gap-3">
                  {chapter.isAIGenerated && (
                    <button
                      type="button"
                      onClick={() =>
                        setRegenerateTarget({
                          chapterId: chapter._id,
                          order: chapter.order,
                          version: chapter.version,
                        })
                      }
                      aria-label={`Regenerate chapter ${chapter.order}`}
                      className="rounded-md p-1.5 text-slate-500 transition-colors duration-200 hover:bg-slate-800 hover:text-indigo-300 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
                      data-testid={`regenerate-chapter-${chapter.order}`}
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  <span className="text-xs text-slate-500">v{chapter.version}</span>
                </div>
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
        <Button
          variant="outline"
          onClick={() => void fetchOne(story._id, { withVersions: true })}
          data-testid="reload-story"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reload
        </Button>
        <Button
          onClick={() => /* reader nav is handled by /stories/:id Manage link */ undefined}
          data-testid="open-reader"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Open reader
        </Button>
      </div>

      <RegenerateDialog
        key={
          regenerateTarget ? `${regenerateTarget.chapterId}:${regenerateTarget.version}` : 'closed'
        }
        open={regenerateTarget !== null}
        storyId={story._id}
        chapterId={regenerateTarget?.chapterId ?? ''}
        chapterNumber={regenerateTarget?.order ?? 1}
        baseVersion={regenerateTarget?.version ?? -1}
        onClose={() => setRegenerateTarget(null)}
        onRegenerated={() => id && void fetchOne(id, { withVersions: true })}
      />
    </div>
  );
}
