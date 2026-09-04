import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';

export interface LoginFormProps {
  onNeedOtp?: (email: string) => void;
}

export function LoginForm({ onNeedOtp }: LoginFormProps) {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.status === 'loading');
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'EMAIL_NOT_VERIFIED' && onNeedOtp) {
        onNeedOtp(email);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Login form" className="space-y-4">
      <div>
        <label htmlFor="login-email" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          aria-required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition-all duration-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          required
          autoComplete="current-password"
          aria-required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition-all duration-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          placeholder="••••••••"
        />
      </div>
      {error && <ErrorAlert error={error} onRetry={clearError} />}
      <Button type="submit" loading={loading} className="w-full" aria-label="Sign in">
        Sign in
      </Button>
    </form>
  );
}