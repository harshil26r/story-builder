// Story Builder — app bootstrap: read CSRF cookie then load the session.
// Runs on startup (main.tsx). The auth store gate also calls this.
import { CSRF_COOKIE_NAME, authApi } from './api';
import { useAuthStore } from '../store/authStore';

let bootstrapped = false;
let inFlight: Promise<void> | null = null;

export async function bootstrap(): Promise<void> {
  // Read the CSRF double-submit cookie on bootstrap (GET /auth/csrf sets it via Set-Cookie).
  if (typeof document !== 'undefined' && !document.cookie.includes(CSRF_COOKIE_NAME)) {
    try {
      await authApi.csrf();
    } catch {
      // CSRF endpoint may be unavailable pre-session; login flow will refetch.
    }
  }
  const store = useAuthStore.getState();
  if (store.status === 'loading' || store.status === 'success') return;
  if (bootstrapped) return;
  bootstrapped = true;
  inFlight = store.bootstrap().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function isBootstrapPending(): boolean {
  return inFlight !== null || !bootstrapped;
}