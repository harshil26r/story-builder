import { Check, Undo2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { wordDiff } from '../../utils/wordDiff';
import type { DiffToken } from '../../utils/wordDiff';

// Side-by-side-in-one-line diff of the author's draft vs the polished output
// (TICKET-77). Additions are highlighted, removals struck through. Accept
// replaces the chapter content; Keep draft discards the polish.

export interface PolishDiffProps {
  original: string;
  polished: string;
  onAccept(): void;
  onReject(): void;
}

function tokenClass(type: DiffToken['type']): string {
  switch (type) {
    case 'add':
      return 'text-emerald-300 bg-emerald-500/10 rounded px-0.5';
    case 'del':
      return 'text-rose-300/70 line-through';
    default:
      return 'text-slate-200';
  }
}

export function PolishDiff({ original, polished, onAccept, onReject }: PolishDiffProps) {
  const tokens = wordDiff(original, polished);

  return (
    <section
      data-testid="polish-diff"
      aria-label="Polish comparison"
      className="space-y-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-indigo-200">Polished draft</h3>
        <span className="text-[11px] text-slate-500">
          <span className="text-emerald-300">added</span> ·{' '}
          <span className="text-rose-300/70 line-through">removed</span>
        </span>
      </div>

      <p className="font-serif text-base leading-relaxed" aria-label="Diff text">
        {tokens.map((t, i) => (
          <span key={`${t.type}-${i}`} data-diff={t.type} className={tokenClass(t.type)}>
            {t.text}
            {i < tokens.length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={onAccept}
          leftIcon={<Check className="h-4 w-4" aria-hidden="true" />}
        >
          Accept polish
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          leftIcon={<Undo2 className="h-4 w-4" aria-hidden="true" />}
        >
          Keep draft
        </Button>
      </div>
    </section>
  );
}

export default { PolishDiff };
