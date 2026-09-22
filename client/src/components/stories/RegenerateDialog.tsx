import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Square } from 'lucide-react';
import type { ID } from '../../types/domain';
import { useGenerationStore } from '../../store/generationStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { ErrorAlert } from '../ui/ErrorAlert';

export type RegenerateMode = 'only' | 'onward';

export interface RegenerateDialogProps {
  open: boolean;
  storyId: ID;
  chapterId: ID;
  chapterNumber: number;
  baseVersion: number;
  onClose: () => void;
  onRegenerated?: () => void;
}

const choiceClass = (selected: boolean) =>
  `w-full rounded-md border px-4 py-2.5 text-left text-sm font-medium transition-all duration-200 ease-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none ${
    selected
      ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-200'
      : 'border-slate-700/60 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800/40 hover:text-slate-100'
  }`;

export function RegenerateDialog({
  open,
  storyId,
  chapterId,
  chapterNumber,
  baseVersion,
  onClose,
  onRegenerated,
}: RegenerateDialogProps) {
  const job = useGenerationStore((s) => s.job);
  const start = useGenerationStore((s) => s.start);
  const abort = useGenerationStore((s) => s.abort);

  const [mode, setMode] = useState<RegenerateMode | null>(null);
  const [working, setWorking] = useState(false);
  const notifiedRef = useRef(false);
  const prevStatusRef = useRef(job.status);

  const belongsToDialog = job.storyId === storyId;
  const failed = working && job.status === 'error' && belongsToDialog;
  const completed = working && job.status === 'done' && belongsToDialog;

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = job.status;
    if (!open || !working || job.status !== 'done' || !belongsToDialog) return;
    if (prev === 'done' || notifiedRef.current) return;
    notifiedRef.current = true;
    onRegenerated?.();
  }, [open, working, job.status, belongsToDialog, onRegenerated]);

  const handleConfirm = () => {
    if (!mode || !open) return;
    setWorking(true);
    void start('regenerate', storyId, { chapterId, mode, baseVersion });
  };

  const handleClose = () => {
    if (working && belongsToDialog) abort();
    onClose();
  };

  const chooseView = (
    <div className="space-y-4">
      <div>
        <p id="regenerate-choice-label" className="text-sm text-slate-400">
          Choose how far the AI rewrite should reach.
        </p>
        <div className="mt-3 space-y-2" role="group" aria-labelledby="regenerate-choice-label">
          <button
            type="button"
            aria-pressed={mode === 'only'}
            onClick={() => setMode('only')}
            className={choiceClass(mode === 'only')}
            data-testid="regenerate-mode-only"
          >
            Regenerate this chapter only
          </button>
          <button
            type="button"
            aria-pressed={mode === 'onward'}
            onClick={() => setMode('onward')}
            className={choiceClass(mode === 'onward')}
            data-testid="regenerate-mode-onward"
          >
            Regenerate this chapter and all onward
          </button>
        </div>
      </div>

      {mode === 'onward' && (
        <p
          role="alert"
          data-testid="regenerate-onward-warning"
          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
        >
          Chapters after {chapterNumber} may diverge from the original.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!mode} data-testid="regenerate-confirm">
          Regenerate
        </Button>
      </div>
    </div>
  );

  const progressView = (
    <div className="space-y-3" data-testid="regenerate-progress">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-indigo-300" role="status">
          <Spinner size="sm" />
          Regenerating chapter {chapterNumber}…
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={handleClose}
          aria-label="Stop regeneration"
          data-testid="regenerate-stop"
        >
          <Square className="h-3.5 w-3.5" aria-hidden="true" />
          Stop
        </Button>
      </div>
      <div
        aria-live="polite"
        className="max-h-56 overflow-y-auto rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3 font-serif text-sm leading-relaxed text-indigo-100"
      >
        {job.fullText || 'Preparing the rewrite…'}
      </div>
    </div>
  );

  const doneView = (
    <div className="space-y-3" data-testid="regenerate-done" role="status">
      <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Chapter {chapterNumber} regenerated successfully.
      </p>
      <div className="flex justify-end">
        <Button onClick={handleClose}>Close</Button>
      </div>
    </div>
  );

  const errorView = (
    <div className="space-y-3" data-testid="regenerate-error">
      <ErrorAlert error={job.error} onRetry={handleConfirm} />
      <div className="flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Regenerate Chapter ${chapterNumber}`}
      width="sm"
    >
      {working ? (failed ? errorView : completed ? doneView : progressView) : chooseView}
    </Modal>
  );
}
