import { useState } from 'react';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';
import { useAuthStore } from '../../store/authStore';

/** Server endpoint the Google OAuth redirect begins at (TICKET-29, ACR-F-05). */
export const GOOGLE_AUTH_URL = '/api/auth/google';

/** Fallback when the server returns 501/404 without a message body. */
export const GOOGLE_DISABLED_MESSAGE = 'Google auth not configured in this deployment.';

export interface GoogleAuthButtonProps {
  /** Optional error sink (e.g. a parent form toast) for 501/404 config failures. */
  onError?: (message: string) => void;
}

/**
 * Env-gated "Continue with Google" button (TICKET-29).
 *
 * Visibility is sourced from the auth store's `googleEnabled`, which the server
 * advertises in the GET /api/auth/me bootstrap response. When the deployment
 * has no GOOGLE_CLIENT_ID the button is hidden entirely; when the server
 * answers the redirect probe with 501 NOT_CONFIGURED we surface a graceful
 * inline message instead of bouncing the user to a dead page.
 */
export function GoogleAuthButton({ onError }: GoogleAuthButtonProps) {
  const googleEnabled = useAuthStore((s) => s.googleEnabled);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Env gate: hidden when the deployment does not advertise Google auth.
  if (!googleEnabled) return null;

  const handleClick = async () => {
    setError(null);
    setBusy(true);
    try {
      // Probe the auth endpoint first — unconfigured deployments answer
      // 501 NOT_CONFIGURED (server sets a session cookie before responding).
      const res = await fetch(GOOGLE_AUTH_URL, { method: 'GET', credentials: 'same-origin' });
      if (res.status === 501 || res.status === 404) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        const msg = body?.message ?? GOOGLE_DISABLED_MESSAGE;
        setError(msg);
        onError?.(msg);
        return;
      }
      // 200/302 — let the browser follow the redirect to Google.
      window.location.assign(GOOGLE_AUTH_URL);
    } catch {
      // Cross-origin probe failure — fall back to a direct redirect.
      window.location.assign(GOOGLE_AUTH_URL);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="mb-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <Button
        type="button"
        variant="outline"
        loading={busy}
        className="w-full border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
        onClick={handleClick}
        aria-label="Continue with Google"
      >
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </Button>
      {error && (
        <ErrorAlert
          error={{ message: error, code: 'NOT_CONFIGURED' }}
          onRetry={() => setError(null)}
        />
      )}
    </div>
  );
}
