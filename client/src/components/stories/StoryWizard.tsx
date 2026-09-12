import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ID, StorySummary } from '../../types/domain';
import { useStoryStore } from '../../store/storyStore';
import { useUiStore } from '../../store/uiStore';
import { StepIndicator } from './StepIndicator';
import { PremiseStep } from './steps/PremiseStep';
import { SettingsStep } from './steps/SettingsStep';
import type { SettingsStepValues } from './steps/SettingsStep';
import { CharactersStep } from './steps/CharactersStep';
import { GenerateStep } from './steps/GenerateStep';
import { CompleteStep } from './steps/CompleteStep';
import { Button } from '../ui/Button';
import { AppShell } from '../ui/AppShell';

const STEPS = ['Premise', 'Settings', 'Characters', 'Generate', 'Complete'];

const DEFAULT_SETTINGS: SettingsStepValues = {
  structureType: 'linear',
  genre: '',
  tone: '',
  targetAudience: '',
  lengthTarget: '',
  pov: '3rd',
  generationMode: 'full-ai',
};

export function StoryWizard() {
  const navigate = useNavigate();
  const create = useStoryStore((s) => s.create);
  const readingMode = useUiStore((s) => s.readingMode);

  const [step, setStep] = useState(1);
  const [premise, setPremise] = useState('');
  const [settings, setSettings] = useState<SettingsStepValues>(DEFAULT_SETTINGS);
  const [characterIds, setCharacterIds] = useState<ID[]>([]);
  const [storyId, setStoryId] = useState<ID | null>(null);
  const [summary, setSummary] = useState<StorySummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const premiseValid = useMemo(() => premise.trim().length >= 10, [premise]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleGenerate = async () => {
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

  const canNext = step === 1 ? premiseValid : step === 2 ? true : step === 3 ? true : false;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">New story</h1>
            <p className="text-sm text-slate-400">Five steps from premise to book.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            Cancel
          </Button>
        </div>

        <StepIndicator step={step} labels={STEPS} />

        {createError && (
          <div role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
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

        <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step <= 1}>
            Back
          </Button>

          {step === 3 ? (
            <Button onClick={() => void handleGenerate()} loading={creating} disabled={!premiseValid} data-testid="generate-book-btn">
              Generate book
            </Button>
          ) : step >= 4 ? null : (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext} data-testid="wizard-next">
              Continue
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}