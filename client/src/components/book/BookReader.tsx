import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Chapter, ChapteredStory } from '../../types/domain';
import { useStoryStore } from '../../store/storyStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useGenerationStore } from '../../store/generationStore';
import { Spinner } from '../ui/Spinner';
import { ErrorAlert } from '../ui/ErrorAlert';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { BookCover } from './BookCover';
import { DisclaimerPage } from './DisclaimerPage';
import { IndexTable } from './IndexTable';
import { ChapterPage } from './ChapterPage';
import { PageFlip } from './PageFlip';
import { ReadingToolbar } from './ReadingToolbar';
import { BranchingView } from '../branching/BranchingView';
import { storiesApi } from '../../services/api';
import { downloadBlob, exportFilename } from '../../utils/download';

type Stage = 'cover' | 'disclaimer' | 'index' | 'reading';

export function BookReader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const story = useStoryStore((s) => s.current);
  const authUser = useAuthStore((s) => s.user);
  const status = useStoryStore((s) => s.status);
  const error = useStoryStore((s) => s.error);
  const fetchOne = useStoryStore((s) => s.fetchOne);
  const publish = useStoryStore((s) => s.publish);
  const remove = useStoryStore((s) => s.remove);

  const readingMode = useUiStore((s) => s.readingMode);
  const setReadingMode = useUiStore((s) => s.setReadingMode);
  const readerMode = useUiStore((s) => s.readerMode);
  const setReaderMode = useUiStore((s) => s.setReaderMode);

  const genStatus = useGenerationStore((s) => s.job.status);

  const [stage, setStage] = useState<Stage>('cover');
  const [page, setPage] = useState(0);
  const [flipDir, setFlipDir] = useState<'forward' | 'backward'>('forward');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'epub' | null>(null);

  useEffect(() => {
    if (id && story?._id !== id) void fetchOne(id);
  }, [id, story?._id, fetchOne]);

  useEffect(() => {
    // If the user refreshes while streaming, resume from the snapshot.
    if (genStatus === 'streaming') return;
    const snapshot = useGenerationStore.getState().job.snapshot;
    if (snapshot && id) void useGenerationStore.getState().resume();
  }, []);

  if (status === 'loading' || (status === 'idle' && !story)) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-label="Loading story"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === 'error' || (status === 'success' && !story)) {
    return (
      <div className="mx-auto max-w-md py-16">
        <ErrorAlert error={error} onRetry={() => id && void fetchOne(id)} />
      </div>
    );
  }

  if (!story) return null;

  const isBranching = story.structureType === 'branching';
  const chapters = isBranching ? [] : (story as ChapteredStory).chapters;
  const maxPage = Math.max(0, chapters.length - 1);

  const handleExport = async (kind: 'pdf' | 'epub') => {
    setExporting(kind);
    try {
      const blob =
        kind === 'pdf'
          ? await storiesApi.exportPdf(story._id)
          : await storiesApi.exportEpub(story._id);
      downloadBlob(blob, exportFilename(story.title, kind));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ReadingToolbar
        readerMode={readerMode}
        onReaderModeChange={setReaderMode}
        readingMode={readingMode}
        onReadingModeChange={setReadingMode}
        onExport={handleExport}
        onDelete={() => setShowDelete(true)}
        onPublishToggle={() => id && void publish(id, !story.isPublic)}
        isPublic={story.isPublic}
        exporting={exporting}
      />

      {story.status === 'draft' && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
          Draft — generate chapters to build the book.
        </p>
      )}

      {stage === 'cover' && (
        <BookCover
          title={story.title}
          author={(story as any).authorName || authUser?.name || 'Anonymous'}
          coverImageUrl={story.coverImageUrl}
          genre={story.genre}
          structureType={story.structureType}
          readingMode={readingMode}
          onOpen={() => setStage('disclaimer')}
        />
      )}

      {stage === 'disclaimer' && (
        <DisclaimerPage customText={story.disclaimerText} onContinue={() => setStage('index')} />
      )}

      {stage === 'index' &&
        (isBranching ? (
          <div>
            <BranchingView storyId={story._id} isPublic={false} dataReadingMode={readingMode} />
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setStage('reading')}
                className="rounded-md border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
              >
                Start reading
              </button>
            </div>
          </div>
        ) : (
          <IndexTable
            chapters={chapters}
            currentOrder={page + 1}
            onNavigate={(order) => {
              setPage(order - 1);
              setFlipDir(order - 1 >= page ? 'forward' : 'backward');
              setStage('reading');
            }}
          />
        ))}

      {stage === 'reading' && (
        <>
          {isBranching ? (
            <BranchingView storyId={story._id} isPublic={false} dataReadingMode={readingMode} />
          ) : (
            <PageFlip pageKey={page} direction={flipDir} onFlipEnd={() => {}} index={page}>
              <ChapterPage
                order={chapters[page]?.order ?? page + 1}
                title={chapters[page]?.title ?? 'Untitled'}
                content={chapters[page]?.content ?? ''}
                dataReadingMode={readingMode}
                dataGenre={story.genre}
              />
            </PageFlip>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setFlipDir('backward');
                setPage((p) => Math.max(0, p - 1));
              }}
              disabled={page === 0 && !isBranching}
              className="rounded-md border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              {isBranching ? 'Branching story' : `Page ${page + 1} of ${Math.max(1, maxPage + 1)}`}
            </span>
            <button
              type="button"
              onClick={() => {
                setFlipDir('forward');
                setPage((p) => Math.min(maxPage, p + 1));
              }}
              disabled={isBranching || page >= maxPage}
              className="rounded-md border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete story?"
        message={`"${story.title}" will be permanently removed along with all chapters.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onCancel={() => setShowDelete(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await remove(story._id);
            navigate('/');
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}

export type { Chapter };
