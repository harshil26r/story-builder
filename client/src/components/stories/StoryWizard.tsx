import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppError, GenerationMode, ID, Pov, StorySummary } from '../../types/domain';
import type { StoryUpdateRequest } from '../../types/api';
import { useStoryStore } from '../../store/storyStore';
import { useUiStore } from '../../store/uiStore';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { StepIndicator } from './StepIndicator';
import { PremiseStep } from './steps/PremiseStep';
import { SettingsStep } from './steps/SettingsStep';
import type { SettingsStepValues } from './steps/SettingsStep';
import { CharactersStep } from './steps/CharactersStep';
import { GenerateStep } from './steps/GenerateStep';
import { CompleteStep } from './steps/CompleteStep';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';

const STEPS = ['Premise', 'Settings', 'Characters', 'Generate', 'Complete'];

const AUTOSAVE_DEBOUNCE_MS = 600;

const DEFAULT_SETTINGS: SettingsStepValues = {
  structureType: 'linear',
  genre: '',
  tone: '',
  targetAudience: '',
  lengthTarget: '',
  pov: '3rd',
  generationMode: 'full-ai',
};

interface DraftSnapshot {
  premise: string;
  genre: string;
  tone: string;
  targetAudience: string;
  lengthTarget: string;
  pov: Pov;
  generationMode: GenerationMode;
  characterIds: ID[];
}

function snapshotOf(
  premise: string,
  settings: SettingsStepValues,
  characterIds: ID[],
): DraftSnapshot {
  return {
    premise: premise.trim(),
    genre: settings.genre,
    tone: settings.tone,
    targetAudience: settings.targetAudience,
    lengthTarget: settings.lengthTarget,
    pov: settings.pov,
    generationMode: settings.generationMode,
    characterIds: [...characterIds],
  };
}

function patchOf(snapshot: DraftSnapshot): StoryUpdateRequest {
  return {
    premise: snapshot.premise,
    genre: snapshot.genre || undefined,
    tone: snapshot.tone || undefined,
    targetAudience: snapshot.targetAudience || undefined,
    lengthTarget: snapshot.lengthTarget || undefined,
    pov: snapshot.pov,
    generationMode: snapshot.generationMode,
    characterIds: snapshot.characterIds,
  };
}

function snapshotsDiffer(a: DraftSnapshot | null, b: DraftSnapshot): boolean {
  if (!a) return true;
  return (
    a.premise !== b.premise ||
    a.genre !== b.genre ||
    a.tone !== b.tone ||
    a.targetAudience !== b.targetAudience ||
    a.lengthTarget !== b.lengthTarget ||
    a.pov !== b.pov ||
    a.generationMode !== b.generationMode ||
    a.characterIds.length !== b.characterIds.length ||
    a.characterIds.some((id, i) => id !== b.characterIds[i])
  );
}

export function StoryWizard() {
  const navigate = useNavigate();
  const create = useStoryStore((s) => s.create);
  const update = useStoryStore((s) => s.update);
  const readingMode = useUiStore((s) => s.readingMode);

  const [step, setStep] = useState(1);
  const [premise, setPremise] = useState('');
  const [settings, setSettings] = useState<SettingsStepValues>(DEFAULT_SETTINGS);
  const [characterIds, setCharacterIds] = useState<ID[]>([]);
  const [storyId, setStoryId] = useState<ID | null>(null);
  const [summary, setSummary] = useState<StorySummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<AppError | null>(null);
  const lastSavedRef = useRef<DraftSnapshot | null>(null);
  const pendingSnapshotRef = useRef<DraftSnapshot | null>(null);

  const premiseValid = useMemo(() => premise.trim().length >= 10, [premise]);

  const runSave = async (snapshot: DraftSnapshot) => {
    if (!storyId) return;
    setSaveState('saving');
    setSaveError(null);
    try {
      await update(storyId, patchOf(snapshot), { silent: true });
      lastSavedRef.current = snapshot;
      pendingSnapshotRef.current = null;
      setSaveState('saved');
    } catch (e) {
      pendingSnapshotRef.current = snapshot;
      setSaveError(e as AppError);
      setSaveState('error');
    }
  };

  const scheduleSave = useDebouncedCallback((snapshot: DraftSnapshot) => {
    void runSave(snapshot);
  }, AUTOSAVE_DEBOUNCE_MS);

  useEffect(() => {
    if (!storyId) return;
    const snapshot = snapshotOf(premise, settings, characterIds);
    if (!snapshotsDiffer(lastSavedRef.current, snapshot)) return;
    scheduleSave(snapshot);
  }, [premise, settings, characterIds, storyId, scheduleSave]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleGenerate = async () => {
    if (storyId) {
      setStep(4);
      return;
    }
    if (!premiseValid || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const id = await create({
        title: premise.trim().slice(0, 60) || 'Untitled story',
        premise: premise.trim(),
        genre: settings.genre || undefined,
        tone: settings.tone || undefined,
        targetAudience: settings.targetAudience || undefined,
        lengthTarget: settings.lengthTarget || undefined,
        pov: settings.pov,
        structureType: settings.structureType,
        generationMode: settings.generationMode,
        characterIds,
      });
      setStoryId(id);
      lastSavedRef.current = snapshotOf(premise, settings, characterIds);
      pendingSnapshotRef.current = null;
      setSaveState('saved');
      setSummary({
        _id: id,
        title: premise.trim().slice(0, 60) || 'Untitled story',
        structureType: settings.structureType,
        status: 'draft',
        totalChapters: 0,
        wordCount: 0,
        coverImageUrl: null,
        updatedAt: new Date().toISOString(),
        isPublic: false,
      });
      setStep(4);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create story.');
    } finally {
      setCreating(false);
    }
  };

  const retrySave = () => {
    if (pendingSnapshotRef.current) void runSave(pendingSnapshotRef.current);
  };

  const canNext = step === 1 ? premiseValid : step === 2 ? true : step === 3 ? true : false;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">New story</h1>
          <p className="text-sm text-slate-500">Five steps from premise to book.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          Cancel
        </Button>
      </div>

      <StepIndicator step={step} labels={STEPS} />

      {(saveState === 'saving' || saveState === 'saved') && (
        <p className="text-xs text-slate-500" aria-live="polite" data-testid="autosave-status">
          {saveState === 'saving' ? 'Saving…' : 'Saved'}
        </p>
      )}

      {saveState === 'error' && saveError && <ErrorAlert error={saveError} onRetry={retrySave} />}

      {createError && (
        <div
          role="alert"
          className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600"
        >
          {createError}
        </div>
      )}

      {step === 1 && <PremiseStep value={premise} onChange={setPremise} pov={settings.pov} />}
      {step === 2 && <SettingsStep value={settings} onChange={setSettings} />}
      {step === 3 && <CharactersStep characterIds={characterIds} onChange={setCharacterIds} />}
      {step === 4 &&
        (storyId ? (
          <GenerateStep storyId={storyId} dataReadingMode={readingMode} onDone={() => setStep(5)} />
        ) : null)}
      {step === 5 && summary && <CompleteStep summary={summary} wordCount={0} />}

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step <= 1}
          data-testid="wizard-back"
        >
          Back
        </Button>

        {step === 3 ? (
          <Button
            onClick={() => void handleGenerate()}
            loading={creating}
            disabled={!premiseValid}
            data-testid="generate-book-btn"
          >
            Generate book
          </Button>
        ) : step >= 4 ? null : (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            data-testid="wizard-next"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
