import type { ReactNode } from 'react';

export interface SkeletonProps {
  className?: string;
  lines?: number;
  children?: ReactNode;
}

const bar = 'animate-pulse rounded-md bg-slate-700/50';

export function Skeleton({ className = '', lines = 3, children }: SkeletonProps) {
  if (children) {
    return (
      <div className={`animate-pulse ${className}`} data-testid="skeleton" aria-hidden="true">
        {children}
      </div>
    );
  }
  return (
    <div className={`space-y-3 ${className}`} data-testid="skeleton" aria-hidden="true" role="presentation">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${bar} ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
          style={{ height: i % 2 === 0 ? 14 : 20 }}
        />
      ))}
    </div>
  );
}

/** Card-shaped skeleton placeholder for grids. */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-800/80 bg-slate-900/60 p-5 ${className}`} data-testid="skeleton-card" aria-hidden="true">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-slate-700/50" />
        <div className="flex-1 space-y-2">
          <div className="h-3 animate-pulse rounded bg-slate-700/50 w-1/2" />
          <div className="h-2.5 animate-pulse rounded bg-slate-700/40 w-1/3" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 animate-pulse rounded bg-slate-700/40 w-full" />
        <div className="h-2.5 animate-pulse rounded bg-slate-700/40 w-5/6" />
        <div className="h-2.5 animate-pulse rounded bg-slate-700/40 w-2/3" />
      </div>
    </div>
  );
}