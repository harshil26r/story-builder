import { useState } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import type { ID, AppError } from '../../types/domain';
import { storiesApi } from '../../services/api';
import { useStoryStore } from '../../store/storyStore';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';

export interface CoverArtGeneratorProps {
  storyId: ID;
  /** Pre-filled cover description (buildCoverPrompt output). */
  description?: string;
  onGenerated?: (imageUrl: string) => void;
}

const DEFAULT_DESCRIPTION =
  'A moody atmospheric cover for a novel, evocative of the premise, with no text or lettering.';

export function CoverArtGenerator({ storyId, description, onGenerated }: CoverArtGeneratorProps) {
  const story = useStoryStore((s) => s.current);
  const update = useStoryStore((s) => s.update);
  const [input, setInput] = useState(description ?? story?.premise ?? DEFAULT_DESCRIPTION);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [generated, setGenerated] = useState<{ imageUrl: string; altText: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    setGenerated(null);
    setSaved(false);
    try {
      const result = await storiesApi.generateCover(storyId, input.trim() || DEFAULT_DESCRIPTION);
      setGenerated(result);
    } catch (e) {
      setError(e as AppError);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generated || saving) return;
    setSaving(true);
    setError(null);
    try {
      await update(storyId, { coverImageUrl: generated.imageUrl });
      setSaved(true);
      onGenerated?.(generated.imageUrl);
    } catch (e) {
      setError(e as AppError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-label="Cover art generator"
      aria-busy={generating || undefined}
      className="rounded-lg border border-slate-800/80 bg-slate-900/90 p-5"
      data-testid="cover-art-generator"
    >
      <header className="flex items-center gap-2">
        <ImagePlus className="h-4 w-4 text-indigo-400" aria-hidden="true" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Cover art</h2>
      </header>

      <label htmlFor="cover-description" className="mt-4 block text-xs font-medium text-slate-400">
        Cover description
      </label>
      <textarea
        id="cover-description"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={4}
        disabled={generating}
        aria-label="Cover description"
        placeholder="Describe the mood, subject, palette, and composition. No text or lettering."
        className="mt-1.5 w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none disabled:opacity-50"
        data-testid="cover-description-input"
      />

      <div className="mt-3">
        <Button
          onClick={handleGenerate}
          loading={generating}
          disabled={!input.trim()}
          data-testid="generate-cover-btn"
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Generate Cover
        </Button>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorAlert error={error} onRetry={handleGenerate} />
        </div>
      )}

      {!generated && !error && !generating && (
        <p className="mt-3 text-xs text-slate-500">
          Describe the cover and generate a first draft, then save it to the story.
        </p>
      )}

      {generated && (
        <figure className="mt-4 space-y-2" data-testid="cover-preview">
          <img
            src={generated.imageUrl}
            alt={generated.altText}
            className="max-h-64 w-full rounded-md border border-slate-700/60 object-contain bg-slate-950/60"
            data-testid="cover-preview-image"
          />
          <figcaption className="text-xs text-slate-400">{generated.altText}</figcaption>
        </figure>
      )}

      {generated && (
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleSave}
            loading={saving}
            disabled={saved}
            data-testid="save-cover-btn"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save
          </Button>
          {saved && (
            <span
              role="status"
              className="text-sm font-medium text-emerald-400"
              data-testid="cover-saved"
            >
              Saved
            </span>
          )}
        </div>
      )}
    </section>
  );
}
