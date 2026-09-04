import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthCard } from '../components/auth/AuthCard';
import { LoginForm } from '../components/auth/LoginForm';
import { GoogleAuthButton, GOOGLE_AUTH_URL } from '../components/auth/GoogleAuthButton';
import { useAuthStore } from '../store/authStore';

/** Stub window.location.assign (jsdom's own Location.assign is non-configurable). */
function stubLocationAssign() {
  const assign = vi.fn<(url: string) => void>();
  const original = window.location;
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...original, assign },
  });
  return { assign, restore: () => Object.defineProperty(window, 'location', { configurable: true, writable: true, value: original }) };
}

let restoreLocation: (() => void) | null = null;

// TICKET-29: env-gated Google auth button.
describe('TICKET-29 — GoogleAuthButton', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'idle', error: null, googleEnabled: false });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    restoreLocation?.();
    restoreLocation = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the Google button when googleEnabled is true', () => {
    useAuthStore.setState({ googleEnabled: true });
    render(<GoogleAuthButton />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('hides the button when googleEnabled is false', () => {
    useAuthStore.setState({ googleEnabled: false });
    render(<GoogleAuthButton />);
    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
  });

  it('navigates to /api/auth/google on click when the server responds', async () => {
    useAuthStore.setState({ googleEnabled: true });
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true }));
    const { assign, restore } = stubLocationAssign();
    restoreLocation = restore;

    render(<GoogleAuthButton />);
    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(GOOGLE_AUTH_URL));
  });

  it('falls back to a direct redirect when the probe fetch fails cross-origin', async () => {
    useAuthStore.setState({ googleEnabled: true });
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { assign, restore } = stubLocationAssign();
    restoreLocation = restore;

    render(<GoogleAuthButton />);
    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(GOOGLE_AUTH_URL));
  });

  it('shows a graceful message when the server returns 501', async () => {
    useAuthStore.setState({ googleEnabled: true });
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 501,
        json: async () => ({ message: 'Google auth is not configured on this server.' }),
      }),
    );

    render(<GoogleAuthButton />);
    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByText('Google auth is not configured on this server.')).toBeInTheDocument();
  });
});

describe('TICKET-29 — GoogleAuthButton in AuthCard', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'idle', error: null, googleEnabled: false });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the Google button on the login card when enabled', () => {
    useAuthStore.setState({ googleEnabled: true });
    render(
      <MemoryRouter>
        <AuthCard mode="login">
          <LoginForm />
        </AuthCard>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: /login form/i })).toBeInTheDocument();
  });

  it('keeps the Google button hidden on the verify card', () => {
    useAuthStore.setState({ googleEnabled: true });
    render(
      <MemoryRouter>
        <AuthCard mode="verify">
          <div>otp</div>
        </AuthCard>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
  });
});