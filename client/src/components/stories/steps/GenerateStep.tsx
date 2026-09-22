import { Square, Wand2 } from 'lucide-react';
import { useGenerationStore } from '../../../store/generationStore';
import { Button } from '../../ui/Button';
import { Spinner } from '../../ui/Spinner';
import { ErrorAlert } from '../../ui/ErrorAlert';
import { ChapterPage } from '../../book/ChapterPage';

export interface GenerateStepProps {
  storyId: string;
  onDone?: () => void;
  dataReadingMode?: 'night' | 'paper';
}

/** Live-streaming generation step with abort/resume affordances. */
export function GenerateStep({ storyId, onDone, dataReadingMode = 'night' }: GenerateStepProps) {
  const job = useGenerationStore((s) => s.job);
  const start = useGenerationStore((s) => s.start);
  const resume = useGenerationStore((s) => s.resume);
  const abort = useGenerationStore((s) => s.abort);

  const streaming = job.status === 'streaming';
  const hasSnapshot = job.snapshot !== null;

  const begin = () => void start('chapter', storyId, { storyId, chapterIndex: 1 });

  return (
    <div className="space-y-4" data-testid="generate-step">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-100">Generating your story</h3>
          <p className="text-sm text-slate-400">
            {streaming
              ? `Writing${job.chapterIndex !== null ? ` chapter ${job.chapterIndex + 1}` : ''}…`
              : job.status === 'done'
                ? 'Generation complete.'
                : 'AI will write chapters with live preview.'}
          </p>
        </div>

        {streaming ? (
          <Button variant="danger" onClick={abort} data-testid="generate-abort">
            <Square className="h-3.5 w-3.5" aria-hidden="true" />
            Stop
          </Button>
        ) : job.status === 'error' ? (
          <Button onClick={begin} data-testid="generate-retry">
            <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </Button>
        ) : hasSnapshot && job.status !== 'done' ? (
          <Button onClick={() => void resume()} data-testid="generate-resume">
            Resume
          </Button>
        ) : job.status === 'idle' ? (
          <Button onClick={begin} data-testid="generate-start">
            <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
            Generate
          </Button>
        ) : null}
      </div>

      {job.error && <ErrorAlert error={job.error} onRetry={begin} />}

      {job.status === 'streaming' && (
        <div
          role="status"
          className="flex items-center gap-2 text-xs text-indigo-300"
          data-testid="generation-progress"
        >
          <Spinner size="sm" />
          <span aria-live="polite">
            Streaming… {job.fullText.length.toLocaleString()} characters
          </span>
        </div>
      )}

      {job.fullText && (
        <div aria-live="polite" data-testid="generation-preview">
          <ChapterPage
            order={1}
            title="Live draft"
            content={job.fullText}
            dataReadingMode={dataReadingMode}
          />
        </div>
      )}

      {job.status === 'done' && (
        <div className="flex justify-center" data-testid="generate-done">
          <Button onClick={onDone} data-testid="generate-continue">
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
