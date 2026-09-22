import { BookOpen, FileText, GitBranch, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { StorySummary } from '../../../types/domain';
import { Button } from '../../ui/Button';

export interface CompleteStepProps {
  summary: StorySummary;
  wordCount: number;
}

const STRUCTURE_ICON = { single: FileText, linear: Layers, branching: GitBranch } as const;

export function CompleteStep({ summary, wordCount }: CompleteStepProps) {
  const Icon = STRUCTURE_ICON[summary.structureType] ?? FileText;
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center" data-testid="complete-step">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
        <BookOpen className="h-8 w-8 text-emerald-400" aria-hidden="true" />
      </div>
      <div>
        <h3 className="font-serif text-2xl font-semibold tracking-tight text-slate-100">
          Your book is ready
        </h3>
        <p className="mt-1 text-sm text-slate-400">Open it to read, edit, and share.</p>
      </div>

      <dl className="flex items-center gap-6 rounded-lg border border-slate-700/60 bg-slate-800/40 px-6 py-4">
        <div>
          <dt className="text-xs uppercase tracking-wider text-slate-500">Title</dt>
          <dd className="font-medium text-slate-200">{summary.title}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-slate-500">Structure</dt>
          <dd className="mt-0.5 inline-flex items-center gap-1 text-sm text-slate-200">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {summary.structureType}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-slate-500">Words</dt>
          <dd className="text-sm text-slate-200">{wordCount.toLocaleString()}</dd>
        </div>
      </dl>

      <Link to={`/stories/${summary._id}`} className="mt-2 inline-block">
        <Button data-testid="open-book-cta">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Open Book
        </Button>
      </Link>
    </div>
  );
}
