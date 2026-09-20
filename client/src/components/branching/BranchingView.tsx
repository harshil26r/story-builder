import { useState } from 'react';
import { GitBranch, Plus, Route, Sparkles, Trash2, X } from 'lucide-react';
import type { ID } from '../../types/domain';
import { useBranchStore, selectNodeById, countChildren } from '../../store/branchStore';
import { AsyncState } from '../ui/AsyncState';
import { SkeletonCard } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';
import { ChapterPage } from '../book/ChapterPage';

export interface BranchingViewProps {
  storyId: ID;
  isPublic?: boolean;
  dataReadingMode?: 'night' | 'paper';
}

/**
 * Branching graph editor: node cards + choice edges. Works for author editing
 * and (read-only when isPublic) inside BookReader / PublicReader.
 */
export function BranchingView({
  storyId,
  isPublic = false,
  dataReadingMode = 'night',
}: BranchingViewProps) {
  const nodes = useBranchStore((s) => s.nodes);
  const edges = useBranchStore((s) => s.edges);
  const status = useBranchStore((s) => s.status);
  const error = useBranchStore((s) => s.error);
  const selectedId = useBranchStore((s) => s.selectedId);
  const fetchNodes = useBranchStore((s) => s.fetch);
  const select = useBranchStore((s) => s.select);
  const addNode = useBranchStore((s) => s.addNode);
  const updateNode = useBranchStore((s) => s.updateNode);
  const deleteNode = useBranchStore((s) => s.deleteNode);
  const addChoice = useBranchStore((s) => s.addChoice);
  const removeChoice = useBranchStore((s) => s.removeChoice);
  const generateNode = useBranchStore((s) => s.generateNode);
  const generation = useBranchStore((s) => s.generation);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [choiceLabel, setChoiceLabel] = useState('');

  const selected = selectedId ? selectNodeById(nodes, selectedId) : undefined;
  const childCount = (id: ID) => countChildren(nodes, id);
  const targetName = (id: ID | null) =>
    id ? (selectNodeById(nodes, id)?.title ?? '(deleted)') : '(dangling)';

  const handleAddNode = () => {
    void addNode(storyId, selectedId);
  };

  const handleSave = async () => {
    if (!selected) return;
    await updateNode(selected, { title, content });
    setTitle('');
    setContent('');
  };

  const handleAddChoice = () => {
    if (!selectedId || !choiceLabel.trim()) return;
    void addChoice(selectedId, choiceLabel.trim());
    setChoiceLabel('');
  };

  const skeleton = (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );

  const empty = (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <GitBranch className="h-10 w-10 text-indigo-400" aria-hidden="true" />
      <div>
        <p className="font-semibold text-slate-200">No branches yet</p>
        <p className="text-sm text-slate-400">
          Create the first scene node of your choose-your-path story.
        </p>
      </div>
      {!isPublic && (
        <Button variant="primary" onClick={handleAddNode} data-testid="branch-add-first">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create first node
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4" data-testid="branching-view">
      <AsyncState
        status={status}
        error={error}
        skeleton={skeleton}
        empty={empty}
        onRetry={() => void fetchNodes(storyId)}
        label="Loading branch nodes"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span data-testid="branch-node-count">{nodes.length}</span> nodes ·{' '}
            <span data-testid="branch-edge-count">{edges.length}</span> choices
          </p>
          {!isPublic && (
            <Button size="sm" onClick={handleAddNode} data-testid="branch-add-node">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add node
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node) => {
            const active = node._id === selectedId;
            const children = childCount(node._id);
            return (
              <div
                key={node._id}
                className={`flex cursor-pointer flex-col rounded-lg border p-4 transition-all duration-200 ease-out focus:outline-none ${
                  active
                    ? 'border-l-4 border-l-indigo-500 border-slate-700/60 bg-indigo-500/10'
                    : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-600'
                }`}
                onClick={() => select(node._id === selectedId ? null : node._id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    select(node._id === selectedId ? null : node._id);
                  }
                }}
                role="button"
                aria-pressed={active}
                aria-label={`Node: ${node.title || 'Untitled'}`}
                data-testid={`branch-node-${node._id}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {node.isStart ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-400">
                        <Route className="h-3 w-3" aria-hidden="true" />
                        start
                      </span>
                    ) : null}
                    {node.isEnding ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-xs text-rose-400">
                        ending
                      </span>
                    ) : null}
                    <h4 className="mt-1 truncate font-medium text-slate-100">
                      {node.title || 'Untitled node'}
                    </h4>
                  </div>
                  {!isPublic && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteNode(node._id);
                      }}
                      aria-label={`Delete ${node.title || 'node'}`}
                      className="rounded p-1 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <p className="mt-2 line-clamp-3 text-xs text-slate-400">
                  {node.content || 'No content yet.'}
                </p>

                <div className="mt-3 space-y-1">
                  {node.choices.map((ch) => {
                    const dangling = ch.targetNodeId === null;
                    return (
                      <div
                        key={ch._id}
                        className={`flex items-center gap-2 rounded border px-2 py-1 text-xs ${
                          dangling
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                            : 'border-sky-500/20 bg-sky-500/5 text-sky-300'
                        }`}
                        data-testid={`choice-${ch._id}`}
                      >
                        <span className="flex-1 truncate">{ch.label}</span>
                        <span className="text-slate-500">→ {targetName(ch.targetNodeId)}</span>
                        {!isPublic && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void removeChoice(node._id, ch._id);
                            }}
                            aria-label={`Remove choice ${ch.label}`}
                            className="rounded p-0.5 text-slate-400 hover:text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="mt-2 text-xs text-slate-500" data-testid={`child-count-${node._id}`}>
                  {children} {children === 1 ? 'child' : 'children'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Selected node detail editor */}
        {selected && !isPublic && (
          <section
            className="rounded-lg border border-slate-700/60 bg-slate-900/70 p-5"
            aria-label="Node detail"
            data-testid="branch-detail"
          >
            <h3 className="font-semibold text-slate-100">{selected.title || 'Untitled node'}</h3>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="branch-title"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Title
                </label>
                <input
                  id="branch-title"
                  defaultValue={selected.title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={() => void handleSave()} data-testid="branch-save">
                  Save node
                </Button>
              </div>
            </div>
            <div className="mt-3">
              <label
                htmlFor="branch-content"
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Content
              </label>
              <textarea
                id="branch-content"
                defaultValue={selected.content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                value={choiceLabel}
                onChange={(e) => setChoiceLabel(e.target.value)}
                placeholder="New choice label"
                aria-label="New choice label"
                className="w-48 rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddChoice}
                disabled={!choiceLabel.trim()}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add choice
              </Button>
            </div>

            {!isPublic && (
              <div className="mt-4 border-t border-slate-800/80 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void generateNode(storyId, selectedId)}
                  disabled={generation.phase === 'streaming'}
                  loading={generation.phase === 'streaming'}
                  data-testid="branch-generate"
                >
                  <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                  {generation.phase === 'streaming' ? 'Generating…' : 'Generate continuation (AI)'}
                </Button>

                {generation.phase === 'streaming' && (
                  <div
                    role="status"
                    aria-live="polite"
                    aria-label="Generating continuation"
                    data-testid="branch-generate-stream"
                    className="mt-3 rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3 transition-all duration-200 ease-out"
                  >
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      Generating…
                    </p>
                    {generation.streamText && (
                      <p className="mt-2 whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-200">
                        {generation.streamText}
                      </p>
                    )}
                  </div>
                )}

                {generation.phase === 'error' && generation.error && (
                  <ErrorAlert
                    error={generation.error}
                    onRetry={() => void generateNode(storyId, selectedId)}
                    className="mt-3"
                  />
                )}
              </div>
            )}
          </section>
        )}

        {/* Chapter-style preview of the selected node (respects book typography) */}
        {selected && (
          <ChapterPage
            order={nodes.indexOf(selected) + 1}
            title={selected.title}
            content={selected.content}
            dataReadingMode={dataReadingMode}
            aria-hidden={undefined}
          >
            {selected.choices.length > 0 && (
              <div className="mt-6 space-y-2" data-testid="node-choices-preview">
                {selected.choices.map((ch) => (
                  <button
                    key={ch._id}
                    type="button"
                    disabled
                    className="block w-full rounded-md border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-left text-sm text-sky-300"
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            )}
          </ChapterPage>
        )}
      </AsyncState>
    </div>
  );
}
