import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { AppError } from '../../types/domain';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';

export interface OtpVerificationProps {
  email?: string;
  purpose?: 'signup-verify' | 'password-reset';
  /** Override of the auto-focus + countdown (testable). */
  initialCountdownSec?: number;
  onSubmitOverride?: (code: string) => Promise<void>;
  onResendOverride?: () => Promise<void>;
  onSuccess?: () => void;
}

const RESEND_COOLDOWN = 60;

export function OtpVerification({
  email = '',
  purpose = 'signup-verify',
  initialCountdownSec,
  onSubmitOverride,
  onResendOverride,
  onSuccess,
}: OtpVerificationProps) {
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const authError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const pushToast = useToastStore((s) => s.push);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [countdownSec, setCountdownSec] = useState(initialCountdownSec ?? RESEND_COOLDOWN);
  const [resendBusy, setResendBusy] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    if (initialCountdownSec !== undefined) return;
    const timer = window.setInterval(() => {
      setCountdownSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [initialCountdownSec]);

  const handleSubmit = async () => {
    if (busy) return;
    clearError();
    setError(null);
    setBusy(true);
    try {
      if (onSubmitOverride) {
        await onSubmitOverride(code);
      } else {
        await verifyOtp(email, code, purpose);
      }
      pushToast('Email verified', 'success');
      onSuccess?.();
    } catch (err: unknown) {
      const appErr = err instanceof AppError ? err : new AppError('UNKNOWN', String(err));
      setError(appErr);
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (resendBusy || countdownSec > 0) return;
    clearError();
    setError(null);
    setResendBusy(true);
    try {
      if (onResendOverride) {
        await onResendOverride();
      } else {
        await sendOtp(email, purpose);
      }
      setCountdownSec(RESEND_COOLDOWN);
      pushToast('New code sent', 'info');
    } catch (err: unknown) {
      const appErr = err instanceof AppError ? err : new AppError('UNKNOWN', String(err));
      setError(appErr);
    } finally {
      setResendBusy(false);
    }
  };

  const displayError = error ?? authError;

  return (
    <form
      aria-label="OTP verification form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="space-y-4"
    >
      {email ? (
        <p className="text-sm text-slate-400">
          We sent a code to <strong className="text-slate-200">{email}</strong>.
        </p>
      ) : null}

      <div>
        <label htmlFor="otp-code" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Verification code
        </label>
        <input
          id="otp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            setCode(text);
            e.preventDefault();
            if (text.length === 6) void handleSubmit();
          }}
          className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-center text-2xl font-mono tracking-[0.5em] text-slate-200 transition-all duration-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
          placeholder="••••••"
          aria-label="6-digit verification code"
        />
      </div>

      {displayError && <ErrorAlert error={displayError} onRetry={clearError} />}

      <Button type="submit" loading={busy} className="w-full" aria-label="Verify code">
        Verify
      </Button>

      <div className="text-center text-xs text-slate-400">
        {countdownSec > 0 ? (
          <span>
            Resend code in <span className="font-mono text-slate-300">{countdownSec}s</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resendBusy}
            className="text-indigo-400 transition-colors duration-200 hover:text-indigo-300 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
            aria-label="Resend verification code"
          >
            Resend code
          </button>
        )}
      </div>
    </form>
  );
}