import { useEffect, useState } from 'react';
import { Wand2 } from 'lucide-react';
import type { Chapter, ID } from '../../types/domain';
import { useGenerationStore } from '../../store/generationStore';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';
import { Spinner } from '../ui/Spinner';
import { formatRelativeTime } from '../../utils/format';
import { PolishDiff } from './PolishDiff';

// AI-enhanced mode draft editor (TICKET-77, ACR-F-10).
// Edits the author's draft, streams an AI polish, and offers accept/reject via
// PolishDiff. Past content versions are listed with timestamps. The parent owns
// persistence — this component is controlled through callbacks.

export interface DraftEditorProps {
  storyId: ID;
  chapter: Chapter;
  onEditDraft?(text: string): void;
  onAcceptPolish?(text: string): void;
  onRejectPolish?(): void;
}

export function DraftEditor({
  storyId,
  chapter,
  onEditDraft,
  onAcceptPolish,
  onRejectPolish,
}: DraftEditorProps) {
  const originalDraft = chapter.draftContent ?? chapter.content;
  const [text, setText] = useState(originalDraft);

  const job = useGenerationStore((s) => s.job);
  const start = useGenerationStore((s) => s.start);
  const reset = useGenerationStore((s) => s.reset);

  // Re-seed when the chapter identity/content version changes.
  useEffect(() => {
    setText(chapter.draftContent ?? chapter.content);
  }, [chapter._id, chapter.version, chapter.draftContent, chapter.content]);

  const forThisChapter = job.chapterIndex === chapter.order && job.storyId === storyId;
  const streaming = job.status === 'streaming' && forThisChapter;
  const polished = job.status === 'done' && forThisChapter ? job.fullText : '';
  const error = job.status === 'error' && forThisChapter ? job.error : null;

  const handlePolish = () => {
    void start('polish', storyId, { storyId, chapterIndex: chapter.order });
  };

  const handleChange = (value: string) => {
    setText(value);
    onEditDraft?.(value);
  };

  const handleAccept = () => {
    setText(polished);
    onAcceptPolish?.(polished);
    reset();
  };

  const handleReject = () => {
    setText(originalDraft);
    onRejectPolish?.();
    reset();
  };

  const versions = chapter.versions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-lg font-semibold text-slate-100">
          {chapter.title || `Chapter ${chapter.order}`}
        </h3>
        <Button
          size="sm"
          variant="secondary"
          onClick={handlePolish}
          disabled={streaming}
          loading={streaming}
          leftIcon={<Wand2 className="h-4 w-4" aria-hidden="true" />}
        >
          Polish draft
        </Button>
      </div>

      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={16}
        spellCheck
        aria-label={`Edit chapter ${chapter.order}`}
        className="w-full rounded-md border border-slate-700/60 bg-slate-900/70 px-4 py-3 font-serif text-base leading-relaxed text-slate-200 transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
        data-testid={`draft-editor-${chapter.order}`}
      />

      {!text.trim() && (
        <p className="text-xs text-slate-500" data-testid="draft-empty">
          This draft is empty — write a scene, then polish it with AI.
        </p>
      )}

      {streaming && (
        <div
          data-testid="polish-stream"
          aria-live="polite"
          className="rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3 font-serif text-base leading-relaxed text-indigo-100"
        >
          <span className="mb-1 flex items-center gap-2 text-[11px] font-sans uppercase tracking-wide text-indigo-300">
            <Spinner size="sm" /> Polishing…
          </span>
          {job.fullText}
        </div>
      )}

      {error && <ErrorAlert error={error} onRetry={handlePolish} />}

      {polished && (
        <PolishDiff
          original={originalDraft}
          polished={polished}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}

      <section data-testid="version-history" aria-label="Version history" className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Version history
        </h4>
        {versions.length === 0 ? (
          <p className="text-xs text-slate-500">No previous versions yet.</p>
        ) : (
          <ul className="space-y-1">
            {versions.map((v) => (
              <li
                key={v.version}
                className="flex items-center justify-between rounded border border-slate-800/80 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-400"
              >
                <span className="font-medium text-slate-300">v{v.version}</span>
                <span className="capitalize">{v.mode}</span>
                <span>{formatRelativeTime(v.modifiedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default { DraftEditor };
