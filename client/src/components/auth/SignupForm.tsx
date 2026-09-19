import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { AppError } from '../../types/domain';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export interface SignupFormProps {
  onOtpSent?: (email: string) => void;
}

export function SignupForm({ onOtpSent }: SignupFormProps) {
  const signup = useAuthStore((s) => s.signup);
  const loading = useAuthStore((s) => s.status === 'loading');
  const clearError = useAuthStore((s) => s.clearError);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      setVerifying(true);
      await signup(name, email, password);
      // Account isn't created yet — an OTP is sent and verified next.
      toast.success('Verification code sent to your email.');
      onOtpSent?.(email);
      navigate('/auth/verify', { state: { email } });
    } catch (err: unknown) {
      const appErr = err instanceof AppError ? err : new AppError('UNKNOWN', String(err));
      toast.error(appErr.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Signup form"
      className={`space-y-4 ${loading ? 'opacity-60' : ''}`}
    >
      <div>
        <label
          htmlFor="signup-name"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          Name
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="signup-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Jane Austen"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="signup-email"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="signup-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="author@studio.com"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="signup-password"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="8+ characters"
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
        <p className="mt-1 text-xs text-slate-500">
          At least 8 characters with a letter and a number.
        </p>
      </div>
      <Button
        type="submit"
        loading={loading || verifying}
        className="w-full py-2.5 text-sm font-semibold bg-slate-900 hover:bg-indigo-600 text-white shadow-lg shadow-slate-900/15"
        aria-label="Create account"
      >
        Create account
      </Button>
    </form>
  );
}
