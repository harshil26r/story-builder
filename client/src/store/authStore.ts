import { create } from 'zustand';
import { AppError } from '../types/domain';
import type { User, AsyncStatus, OtpPurpose } from '../types/domain';
import { authApi } from '../services/api';

export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  if (e instanceof Error) return new AppError('UNKNOWN', e.message);
  return new AppError('UNKNOWN', String(e));
}

interface AuthState {
  user: User | null;
  status: AsyncStatus;
  error: AppError | null;
  googleEnabled: boolean;
  bootstrap(): Promise<void>;
  login(email: string, password: string): Promise<void>;
  signup(name: string, email: string, password: string): Promise<void>;
  sendOtp(email: string, purpose: OtpPurpose): Promise<void>;
  verifyOtp(email: string, code: string, purpose: OtpPurpose): Promise<void>;
  logout(): Promise<void>;
  clearError(): void;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  status: 'idle',
  error: null,
  googleEnabled: false,

  bootstrap: async () => {
    set({ status: 'loading', error: null });
    try {
      const { user, googleEnabled } = await authApi.me();
      // 'empty' = checked, no session (distinct from 'idle' pre-bootstrap so
      // route gates can redirect guests instead of spinning forever).
      // googleEnabled is a deployment flag; degrade gracefully while the
      // parallel backend change lands (payload.googleEnabled ?? false).
      set({ user, status: user ? 'success' : 'empty', googleEnabled: googleEnabled ?? false });
    } catch (e) {
      const err = toAppError(e);
      set({ error: err, status: 'empty' });
    }
  },

  login: async (email, password) => {
    set({ status: 'loading', error: null });
    try {
      await authApi.login({ email, password });
      const { user, googleEnabled } = await authApi.me();
      set({ user, status: 'success', googleEnabled: googleEnabled ?? false });
    } catch (e) {
      const err = toAppError(e);
      set({ error: err, status: 'error' });
      throw err;
    }
  },

  signup: async (name, email, password) => {
    set({ status: 'loading', error: null });
    try {
      await authApi.signup({ name, email, password });
      set({ status: 'success' });
    } catch (e) {
      const err = toAppError(e);
      set({ error: err, status: 'error' });
      throw err;
    }
  },

  sendOtp: async (email, purpose) => {
    set({ status: 'loading', error: null });
    try {
      await authApi.sendOtp({ email, purpose });
      set({ status: 'success' });
    } catch (e) {
      const err = toAppError(e);
      set({ error: err, status: 'error' });
      throw err;
    }
  },

  verifyOtp: async (email, code, purpose) => {
    set({ status: 'loading', error: null });
    try {
      await authApi.verifyOtp({ email, code, purpose });
      const { user, googleEnabled } = await authApi.me();
      set({ user, status: 'success', googleEnabled: googleEnabled ?? false });
    } catch (e) {
      const err = toAppError(e);
      set({ error: err, status: 'error' });
      throw err;
    }
  },

  logout: async () => {
    set({ status: 'loading', error: null });
    try {
      await authApi.logout();
      set({ user: null, status: 'empty' });
    } catch (e) {
      const err = toAppError(e);
      set({ error: err, status: 'error' });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
