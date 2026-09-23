import type { ReactNode } from 'react';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';
import { EmptyState } from './EmptyState';
import type { AsyncStatus } from '../../types/domain';

export interface AsyncStateProps {
  status: AsyncStatus;
  error?: Error | null;
  /** Skeleton shown while loading. */
  skeleton?: ReactNode;
  /** Empty-state content (icon, title, action). */
  empty?: ReactNode;
  /** Error content; defaults to <ErrorAlert>. */
  errorNode?: ReactNode;
  onRetry?: () => void;
  children?: ReactNode;
  /** Render children only on success/empty/error (not loading). */
  asLoading?: boolean;
  label?: string;
}

/**
 * Declarative 4-state wrapper (SPEC §4.5): loading skeleton / empty CTA /
 * error alert with retry / success children.
 */
export function AsyncState({
  status,
  error,
  skeleton,
  empty,
  errorNode,
  onRetry,
  children,
  label,
}: AsyncStateProps) {
  if (status === 'loading') {
    return (
      <div aria-busy="true" aria-label={label ?? 'Loading'} role="status">
        {skeleton ?? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" label={label ?? 'Loading'} />
          </div>
        )}
      </div>
    );
  }
  if (status === 'empty') {
    return <>{empty ?? <EmptyState />}</>;
  }
  if (status === 'error') {
    if (errorNode) return <>{errorNode}</>;
    return (
      <ErrorAlert
        error={
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                code: (error as { code?: string }).code,
              }
            : new Error('An unexpected error occurred.')
        }
        onRetry={onRetry}
      />
    );
  }
  return <>{children}</>;
}
