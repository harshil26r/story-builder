import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { FieldError } from '../../types/domain';
import { Button } from './Button';

export interface ErrorAlertProps {
  error?: { name?: string; message: string; code?: string; fields?: FieldError[] } | null;
  onRetry?: () => void;
  className?: string;
}

export function ErrorAlert({ error, onRetry, className = '' }: ErrorAlertProps) {
  const msg = error?.message ?? 'Something went wrong.';
  const code = error?.code;
  const fields = error?.fields;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm ${className}`}
      data-testid="error-alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-rose-300">{msg}</p>
          {fields && fields.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-xs text-rose-300/80 list-disc pl-4">
              {fields.map((f, i) => (
                <li key={i}>
                  <strong>{f.field}:</strong> {f.message}
                </li>
              ))}
            </ul>
          )}
          {code && (
            <details className="mt-2 text-xs text-rose-300/50">
              <summary className="cursor-pointer hover:text-rose-300/70">Technical details</summary>
              <p className="mt-1 font-mono">{code}</p>
            </details>
          )}
          {onRetry && (
            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={onRetry} aria-label="Retry">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}