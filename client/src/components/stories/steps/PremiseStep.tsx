import { Sparkles } from 'lucide-react';
import type { Pov } from '../../../types/domain';

export interface PremiseStepProps {
  value: string;
  onChange: (premise: string) => void;
  pov: Pov;
}

export function PremiseStep({ value, onChange, pov }: PremiseStepProps) {
  const valid = value.trim().length >= 10;
  const count = value.trim().length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-sm text-slate-400">
        <Sparkles className="h-4 w-4 text-indigo-400" aria-hidden="true" />
        {pov === '1st' ? 'What is this story about? (first person)' : pov === '2nd' ? '(second person)' : '(third person)'}
      </div>
      <label htmlFor="premise" className="sr-only">Story premise</label>
      <textarea
        id="premise"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder="A lighthouse keeper on a frozen island discovers a journal that predicts the day everyone will disappear…"
        className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-3 text-sm text-slate-200 transition-all duration-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
      />
      <div className="flex items-center justify-between text-xs">
        <span className={`${valid ? 'text-emerald-400' : 'text-slate-500'}`} data-testid="premise-valid">
          {valid ? 'Great — your premise is ready.' : `At least 10 characters (${count}/10)`}
        </span>
      </div>
    </div>
  );
}