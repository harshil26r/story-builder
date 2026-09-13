import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { storiesApi } from '../../services/api';
import type { Story, ChapteredStory, ID } from '../../types/domain';
import { AppShell } from '../ui/AppShell';
import { Spinner } from '../ui/Spinner';
import { ErrorAlert } from '../ui/ErrorAlert';
import { BookCover } from './BookCover';
import { DisclaimerPage } from './DisclaimerPage';
import { IndexTable } from './IndexTable';
import { ChapterPage } from './ChapterPage';
import { PageFlip } from './PageFlip';
import { BranchingView } from '../branching/BranchingView';

type Stage = 'cover' | 'disclaimer' | 'index' | 'reading';

/** Read-only public reader: no TopNav logout, no edit affordances. */
export function PublicReader() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [stage, setStage] = useState<Stage>('cover');
  const [page, setPage] = useState(0);
  const [flipDir, setFlipDir] = useState<'forward' | 'backward'>('forward');
  const [branchPath, setBranchPath] = useState<ID[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<ID | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setStatus('error');
      setError(new Error('Missing share link.'));
      return;
    }
    setStatus('loading');
    storiesApi
      .getShare(shareToken)
      .then((s) => {
        setStory(s);
        setStatus('success');
        if (s.structureType === 'branching') {
          const start = s.nodes.find((n) => n.isStart) ?? s.nodes[0];
          if (start) {
            setCurrentNodeId(start._id);
            setBranchPath([start._id]);
          }
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e : new Error('Story not found.'));
        setStatus('error');
      });
  }, [shareToken]);

  if (status === 'loading') {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading story">
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (status === 'error' || !story) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-16">
          <ErrorAlert error={error ?? new Error('Story not found.')} />
        </div>
      </AppShell>
    );
  }

  const isBranching = story.structureType === 'branching';
  const chapters = isBranching ? [] : (story as ChapteredStory).chapters ?? [];
  const maxPage = Math.max(0, chapters.length - 1);
  const currentNode = isBranching ? story.nodes.find((n) => n._id === currentNodeId) : undefined;

  return (
    <AppShell user={null}>
      <div className="mx-auto max-w-4xl space-y-6 py-4">
        {stage === 'cover' && (
          <BookCover
            title={story.title}
            coverImageUrl={story.coverImageUrl}
            genre={story.genre}
            structureType={story.structureType}
            onOpen={() => setStage('disclaimer')}
          />
        )}

        {stage === 'disclaimer' && (
          <DisclaimerPage customText={story.disclaimerText} onContinue={() => setStage('index')} />
        )}

        {stage === 'index' &&
          (isBranching ? (
            <div className="space-y-4">
              <BranchingView storyId={story._id} isPublic dataReadingMode="night" />
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStage('reading')}
                  className="rounded-md border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
                >
                  Start your path
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
              <div className="space-y-4">
                {/* History breadcrumb */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs" data-testid="path-breadcrumb">
                  {branchPath.map((id, i) => {
                    const n = story.nodes.find((nd) => nd._id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5">
                        {i > 0 && <span className="text-slate-600">→</span>}
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentNodeId(id);
                            setBranchPath(branchPath.slice(0, i + 1));
                          }}
                          className="rounded px-1.5 py-0.5 text-indigo-300 transition-colors hover:bg-slate-800 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
                        >
                          {n?.title ?? '…'}
                        </button>
                      </span>
                    );
                  })}
                </div>

                {currentNode ? (
                  <ChapterPage
                    order={branchPath.length}
                    title={currentNode.title}
                    content={currentNode.content}
                    dataReadingMode="night"
                  >
                    {currentNode.choices.length > 0 && (
                      <div className="mt-6 space-y-2" data-testid="choice-list">
                        {currentNode.choices.map((ch) => (
                          <button
                            key={ch._id}
                            type="button"
                            disabled={ch.targetNodeId === null}
                            onClick={() => {
                              if (ch.targetNodeId) {
                                setCurrentNodeId(ch.targetNodeId);
                                setBranchPath((p) => [...p, ch.targetNodeId!]);
                              }
                            }}
                            className="block w-full rounded-md border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-left text-sm text-sky-300 transition-all duration-200 hover:translate-x-1 hover:bg-sky-500/20 hover:border-sky-400/40 focus:ring-2 focus:ring-sky-500/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                            data-testid={`choice-${ch._id}`}
                          >
                            {ch.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </ChapterPage>
                ) : (
                  <p className="text-center text-sm text-slate-500">This story has no nodes yet.</p>
                )}
              </div>
            ) : (
              <PageFlip pageKey={page} direction={flipDir} index={page}>
                <ChapterPage
                  order={chapters[page]?.order ?? page + 1}
                  title={chapters[page]?.title ?? 'Untitled'}
                  content={chapters[page]?.content ?? ''}
                  dataReadingMode="night"
                  dataGenre={story.genre}
                />
              </PageFlip>
            )}

            {!isBranching && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setFlipDir('backward');
                    setPage((p) => Math.max(0, p - 1));
                  }}
                  disabled={page === 0}
                  className="rounded-md border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  Page {page + 1} of {Math.max(1, maxPage + 1)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFlipDir('forward');
                    setPage((p) => Math.min(maxPage, p + 1));
                  }}
                  disabled={page >= maxPage}
                  className="rounded-md border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}