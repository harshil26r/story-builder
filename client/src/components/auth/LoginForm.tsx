import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { AppError } from '../../types/domain';
import { Button } from '../ui/Button';

export interface LoginFormProps {
  onNeedOtp?: (email: string) => void;
}

export function LoginForm({ onNeedOtp }: LoginFormProps) {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.status === 'loading');
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
    } catch (err: unknown) {
      const appErr = err instanceof AppError ? err : new AppError('UNKNOWN', String(err));
      toast.error(appErr.message);
      if (appErr.code === 'EMAIL_NOT_VERIFIED' && onNeedOtp) {
        onNeedOtp(email);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Login form" className="space-y-4">
      <div>
        <label
          htmlFor="login-email"
          className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          <span>Email</span>
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            aria-required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="author@studio.com"
          />
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            htmlFor="login-password"
            className="text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            Password
          </label>
          <button
            type="button"
            className="text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            onClick={() => {
              if (!email) {
                toast.error('Enter your email address to reset your password.');
                return;
              }
              // Navigate to signup/verify flow by triggering OTP reset - use auth store if available
              try {
                useAuthStore.getState().sendOtp?.(email, 'reset');
                toast.success('Password reset code sent to your email.');
              } catch (err) {
                toast.error('Unable to send password reset code.');
              }
            }}
            aria-label="Forgot password"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            aria-required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button
        type="submit"
        loading={loading}
        className="w-full py-2.5 text-sm font-semibold bg-slate-900 hover:bg-indigo-600 text-white shadow-lg shadow-slate-900/15"
        aria-label="Sign in"
      >
        Sign in
      </Button>
    </form>
  );
}
