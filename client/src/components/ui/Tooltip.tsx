import { useId, type ReactNode } from 'react';

export interface TooltipProps {
  label: string;
  children: ReactNode;
}

/** Lightweight accessible tooltip (hover + focus-visible). */
export function Tooltip({ label, children }: TooltipProps) {
  const id = useId();
  return (
    <span className="group relative inline-flex" tabIndex={-1}>
      <span aria-describedby={id}>{children}</span>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700/60 bg-slate-800/95 px-2 py-1 text-xs text-slate-200 opacity-0 shadow-lg shadow-black/30 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
