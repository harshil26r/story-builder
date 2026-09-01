import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon = BookOpen,
  title = 'Nothing here yet',
  description = 'Take the next step to get started.',
  action,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-700/60 bg-slate-900/30 px-6 py-14 text-center"
      data-testid="empty-state"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl" aria-hidden="true" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/60 ring-1 ring-slate-700/60">
          <Icon className="h-7 w-7 text-indigo-400" aria-hidden="true" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold tracking-tight text-slate-200">{title}</h3>
        <p className="max-w-sm text-sm text-slate-400">{description}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}