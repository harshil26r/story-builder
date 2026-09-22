import { Check } from 'lucide-react';

export interface StepIndicatorProps {
  step: number;
  labels: string[];
}

export function StepIndicator({ step, labels }: StepIndicatorProps) {
  return (
    <ol
      className="flex items-center gap-1"
      aria-label="Story wizard steps"
      data-testid="step-indicator"
    >
      {labels.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <li key={label} className="flex items-center gap-1">
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all duration-200 ${
                active
                  ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40'
                  : done
                    ? 'text-emerald-400'
                    : 'text-slate-500'
              }`}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check className="h-3 w-3" aria-hidden="true" /> : <span>{idx}</span>}
              <span className={active ? '' : done ? '' : ''}>{label}</span>
            </div>
            {idx < labels.length && <span className="h-px w-3 bg-slate-700" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
