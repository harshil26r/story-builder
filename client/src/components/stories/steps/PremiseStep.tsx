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
      <div className="flex items-center gap-1.5 text-sm text-slate-600">
        <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden="true" />
        {pov === '1st'
          ? 'What is this story about? (first person)'
          : pov === '2nd'
            ? '(second person)'
            : '(third person)'}
      </div>
      <label htmlFor="premise" className="sr-only">
        Story premise
      </label>
      <textarea
        id="premise"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder="A lighthouse keeper on a frozen island discovers a journal that predicts the day everyone will disappear…"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none shadow-xs"
      />
      <div className="flex items-center justify-between text-xs">
        <span
          className={`${valid ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}
          data-testid="premise-valid"
        >
          {valid ? 'Great — your premise is ready.' : `At least 10 characters (${count}/10)`}
        </span>
      </div>
    </div>
  );
}
