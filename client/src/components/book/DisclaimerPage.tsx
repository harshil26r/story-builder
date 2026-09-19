import { Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

export interface DisclaimerPageProps {
  customText?: string;
  onContinue: () => void;
  title?: string;
}

const DEFAULT_DISCLAIMER =
  'This story was written with the assistance of artificial intelligence (AI). ' +
  'Characters, events, and dialogue are fictional. Any resemblance to real persons, ' +
  'living or dead, is purely coincidental.';

export function DisclaimerPage({
  customText,
  onContinue,
  title = 'Disclaimer',
}: DisclaimerPageProps) {
  const disclaimer = customText?.trim() || DEFAULT_DISCLAIMER;
  return (
    <div
      className="mx-auto flex max-w-xl flex-col items-center rounded-lg border border-slate-800/80 bg-slate-900/70 p-10 text-center"
      data-testid="disclaimer-page"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15 ring-1 ring-indigo-500/30">
        <Sparkles className="h-6 w-6 text-indigo-400" aria-hidden="true" />
      </div>
      <h2 className="mt-4 font-serif text-2xl font-semibold tracking-tight text-slate-100">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-slate-300" data-testid="disclaimer-text">
        {disclaimer}
      </p>
      <Button className="mt-8" onClick={onContinue} data-testid="disclaimer-continue">
        Continue
      </Button>
    </div>
  );
}
