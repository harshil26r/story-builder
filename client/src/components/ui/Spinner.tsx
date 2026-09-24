import { LoaderCircle } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const SIZE: Record<string, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
};

export function Spinner({ size = 'md', label, className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? 'Loading'}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <LoaderCircle
        className={`${SIZE[size]} animate-spin text-indigo-400`}
        aria-hidden="true"
        data-testid="spinner"
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
