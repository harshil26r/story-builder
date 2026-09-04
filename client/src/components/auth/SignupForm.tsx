import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../../store/authStore';
import { AppError } from '../../types/domain';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';
import { useNavigate } from 'react-router-dom';

export interface SignupFormProps {
  onOtpSent?: (email: string) => void;
}

export function SignupForm({ onOtpSent }: SignupFormProps) {
  const signup = useAuthStore((s) => s.signup);
  const loading = useAuthStore((s) => s.status === 'loading');
  const authError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setError(null);
    try {
      setVerifying(true);
      await signup(name, email, password);
      // Server sends OTP on signup; move to verification step.
      onOtpSent?.(email);
      navigate('/auth/verify', { state: { email } });
    } catch (err: unknown) {
      const appErr = err instanceof AppError ? err : new AppError('UNKNOWN', String(err));
      setError(appErr);
    } finally {
      setVerifying(false);
    }
  };

  const displayError = error ?? authError;

  return (
    <form onSubmit={handleSubmit} aria-label="Signup form" className={`space-y-4 ${loading ? 'opacity-60' : ''}`}>
      <div>
        <label htmlFor="signup-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Name
        </label>
        <input
          id="signup-name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition-all duration-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          placeholder="Jane Austen"
        />
      </div>
      <div>
        <label htmlFor="signup-email" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition-all duration-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition-all duration-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          placeholder="8+ characters"
        />
        <p className="mt-1 text-xs text-slate-500">At least 8 characters with a letter and a number.</p>
      </div>
      {displayError && <ErrorAlert error={displayError} onRetry={clearError} />}
      <Button type="submit" loading={loading || verifying} className="w-full" aria-label="Create account">
        Create account
      </Button>
    </form>
  );
}