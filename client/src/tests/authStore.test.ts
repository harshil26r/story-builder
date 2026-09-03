import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import { makeUser } from './fixtures';

// TICKET-19: Auth Zustand store.
describe('TICKET-19 — auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'idle', error: null, googleEnabled: false });
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bootstrap calls GET /auth/me and sets user', async () => {
    const user = makeUser();
    const meSpy = vi.spyOn(authApi, 'me').mockResolvedValue({ user });

    await useAuthStore.getState().bootstrap();

    expect(meSpy).toHaveBeenCalled();
    expect(useAuthStore.getState().user?._id).toBe('u1');
    expect(useAuthStore.getState().status).toBe('success');
  });

  it('bootstrap leaves user null when /me returns null', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue({ user: null });

    await useAuthStore.getState().bootstrap();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('empty');
  });

  it('bootstrap reads googleEnabled from /me and degrades defensively', async () => {
    const user = makeUser();
    vi.spyOn(authApi, 'me').mockResolvedValue({ user, googleEnabled: true });

    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().googleEnabled).toBe(true);

    // Backend field not yet live (parallel agent) — must degrade to false.
    vi.spyOn(authApi, 'me').mockResolvedValue({ user });
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().googleEnabled).toBe(false);
  });

  it('login posts credentials and loads the user', async () => {
    const user = makeUser();
    const loginSpy = vi.spyOn(authApi, 'login').mockResolvedValue({ ok: true });
    vi.spyOn(authApi, 'me').mockResolvedValue({ user });

    await useAuthStore.getState().login('jane@example.com', 'password1');

    expect(loginSpy).toHaveBeenCalledWith({ email: 'jane@example.com', password: 'password1' });
    expect(useAuthStore.getState().user?._id).toBe('u1');
    expect(useAuthStore.getState().status).toBe('success');
  });

  it('signup posts name/email/password', async () => {
    const signupSpy = vi.spyOn(authApi, 'signup').mockResolvedValue({ ok: true });

    await useAuthStore.getState().signup('Jane', 'jane@example.com', 'password1');

    expect(signupSpy).toHaveBeenCalledWith({ name: 'Jane', email: 'jane@example.com', password: 'password1' });
    expect(useAuthStore.getState().status).toBe('success');
  });

  it('logout posts and clears user', async () => {
    useAuthStore.setState({ user: makeUser(), status: 'success', error: null });
    const logoutSpy = vi.spyOn(authApi, 'logout').mockResolvedValue({ ok: true });

    await useAuthStore.getState().logout();

    expect(logoutSpy).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('empty');
  });

  it('clearError resets error', () => {
    useAuthStore.setState({ error: { name: 'AppError', message: 'x', code: 'X' } } as never);
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('login failure transitions to error and surfaces AppError', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue(new Error('nope'));
    await expect(useAuthStore.getState().login('a@b.c', 'bad')).rejects.toThrow('nope');
    expect(useAuthStore.getState().status).toBe('error');
  });
});